import { MmjsTestCase } from '../mmjs-test-case';
import { MovToFmp4Flow } from '../../src/flows/mov-to-fmp4.flow';

export class RemixMovieSoundtrack extends MmjsTestCase {

  private _flow: MovToFmp4Flow = null;

  setup(done: () => void) {

    const videoEl = document.createElement('video');
    videoEl.controls = true;
    videoEl.addEventListener('error', () => {
      console.error(videoEl.error);
    });

    const mediaSource = new MediaSource();

    videoEl.src = URL.createObjectURL(mediaSource);

    this._flow = new MovToFmp4Flow('/test-data/mp4/v-0576p-1400k-libx264.mov', mediaSource);

    this.domMountPoint.appendChild(videoEl);
  }

  run() {

  }
}