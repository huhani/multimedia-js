import {Processor} from '../core/processor';
import {Packet} from '../core/packet';
import {InputSocket, SocketDescriptor, SocketType, OutputSocket} from '../core/socket';

import {getLogger} from '../logger'

const {log} = getLogger('MP4DemuxProcessor')

import {createMp4Demuxer, Mp4Demuxer, Track, Frame, TracksHash, Atom} from '../ext-mod/inspector.js/src/index';

import { PayloadDescriptor } from '../core/mime-type';

import { Mp4Track } from '../ext-mod/inspector.js/src/demuxer/mp4/mp4-track';
import { BufferProperties, BufferSlice } from '../core/buffer';
import { AvcC } from '../ext-mod/inspector.js/src/demuxer/mp4/atoms/avcC';

export class MP4DemuxProcessor extends Processor {

    private _demuxer: Mp4Demuxer;

    private _trackIdToOutputs: { [id: number] : OutputSocket} = {};

    private _onCreateOutput: (out: OutputSocket) => void;

    constructor(onCreateOutput: (out: OutputSocket) => void = null) {
        super();
        this.createInput()

        this._demuxer = createMp4Demuxer();

        this._onCreateOutput = onCreateOutput;
    }

    templateSocketDescriptor(st: SocketType): SocketDescriptor {
      return new SocketDescriptor()
    }

    private _ensureOutputForTrack(track: Track): OutputSocket {

      const payloadDescriptor = new PayloadDescriptor(track.mimeType);
      const sd = new SocketDescriptor([
        payloadDescriptor
      ]);

      if (!this._trackIdToOutputs[track.id]) {
        const out = this._trackIdToOutputs[track.id] = this.createOutput(sd);

        if (this._onCreateOutput) {
          this._onCreateOutput(out);
        }
      }

      return this._trackIdToOutputs[track.id];
    }

    protected processTransfer_(inS: InputSocket, p: Packet) {

      p.data.forEach((bufferSlice) => {

        this._demuxer.append(bufferSlice.getUint8Array());
        this._demuxer.end();

        const tracks: TracksHash = this._demuxer.tracks;
        const atoms: Atom[] = this._demuxer.getAtoms();

        for (const trackId in tracks) {
          const track: Mp4Track = <Mp4Track> tracks[trackId];

          //track.update();

          log('mime-type:', track.mimeType, track.id, track.getDuration(), track.type, track.getTimescale());

          if (track.isVideo()) {
            log('video-track:', track.getResolution());
          }

          //log('timescale', track.ge)

          log('defaults', track.getDefaults())

          const output: OutputSocket = this._ensureOutputForTrack(track);

          const avcC = (<AvcC> track.getReferenceAtom());

          const sps: Uint8Array[] = avcC.sps;
          const pps: Uint8Array[] = avcC.pps;

          const avcCodecData = avcC.data;

          const initProps: BufferProperties = new BufferProperties();

          initProps.isBitstreamHeader = true;

          //output.transfer(Packet.fromSlice(BufferSlice.fromTypedArray(sps[0], initProps)));
          //output.transfer(Packet.fromSlice(BufferSlice.fromTypedArray(pps[0], initProps)));

          output.transfer(Packet.fromSlice(BufferSlice.fromTypedArray(avcCodecData, initProps)));

          if (avcC.numOfPictureParameterSets > 1 || avcC.numOfSequenceParameterSets > 1) {
            throw new Error('No support for more than one sps/pps pair');
          }

          const props: BufferProperties = new BufferProperties(
            track.mimeType,
            track.getDefaults().sampleDuration,
            NaN,
            1
          );

          // General time-delta applied to these tracks buffers
          props.timestampDelta = 0;

          track.getFrames().forEach((frame: Frame) => {

            //log('frame:', frame.frameType, frame.bytesOffset, frame.size, frame.getDecodingTimeUs(), frame.getPresentationTimeUs());

            const frameSlice = bufferSlice.unwrap(
              frame.bytesOffset,
              frame.size,
              props
            );

            console.log(frame.size);

            const p: Packet = Packet.fromSlice(frameSlice);

            // timestamps of this packet
            p.timestamp = frame.getDecodingTimestampInSeconds();
            p.presentationTimeOffset = frame.getPresentationTimestampInSeconds() - frame.getDecodingTimestampInSeconds();

            //console.log(frame.bytesOffset, frame.size);

            output.transfer(p)
          })
        }

      })

      return true
    }
}
