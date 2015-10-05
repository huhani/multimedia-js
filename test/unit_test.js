var create = require('lodash.create'),
	Unit = require('../unit.js'),
	UnitFile = require('../unit-file.js'),
	UnitMP4Mux = require('../unit-mp4-mux.js'),
	Transfer = Unit.Transfer,
	BaseSink = Unit.BaseSink,
	BasePushSrc = Unit.BasePushSrc;
	BaseTransform = Unit.BaseTransform;

const FIXTURES_DIR = 'test/fixtures/';

var FooBarTransform = function FooBarTransform() {
	BaseTransform.prototype.constructor.apply(this, arguments);
};

FooBarTransform.prototype = create(BaseTransform.prototype, {

	constructor: FooBarTransform,

	_transform: function(transfer) {
		console.log('_transform');

		transfer.data += 'barfoo';
		transfer.encoding = 'utf8';

		console.log(transfer.data);
	},
});

function testTransfer1(src, sink, done) {

	var transfer,
		dataCtr = 0;

	sink._onData = function() {
		transfer = sink.dequeue();

		console.log(transfer.encoding);
		console.log(transfer.data+"");

		dataCtr++;

		console.log('data ' + dataCtr);

		if (dataCtr == 4) {
			src.out(0).pause();

			console.log(src.out(0).isPaused());

			src.enqueue(new Transfer('foobar', 'utf8'));
			src.enqueue(new Transfer('foobar', 'utf8'));
			src.enqueue(new Transfer('foobar', 'utf8'));
			src.enqueue(new Transfer('foobar', 'utf8'));

			src.out(0).resume();
		}
		else if (dataCtr == 5) {
			done();
		}
	};

	src.out(0).on('end', function() {
		console.log('end of stream');
	});

	src.out(0).pause();

	src.enqueue(new Transfer('foobar', 'utf8'));
	src.enqueue(new Transfer('foobar', 'utf8'));
	src.enqueue(new Transfer('foobar', 'utf8'));
	src.enqueue(new Transfer('foobar', 'utf8'));

	src.out(0).resume();
}

describe("Unit", function() {

	describe("BasePushSrc -> BaseSink", function() {

		it('should pass data', function (done) {

			var src = new BasePushSrc(),
				sink = new BaseSink();

						// link them
			src.out(0).pipe(sink.in(0));

			testTransfer1(src, sink, done);
		});

	});

	describe("BasePushSrc -> FooBarTransform -> BaseSink", function() {

		it('should pass data and transform it', function (done) {

			var src = new BasePushSrc(),
				transform = new FooBarTransform();
				sink = new BaseSink();

			// link them
			Unit.link(src, transform, sink);

			testTransfer1(src, sink, done);
		});

	});

});

describe("UnitFile", function() {

	var foobar = FIXTURES_DIR + 'foobar.txt';
	var copy = FIXTURES_DIR + 'foobar_copy.txt';

	describe("constructor", function() {
		it('should open', function () {
			var src = new UnitFile.Src(foobar);
			var sink = new UnitFile.Sink(copy);

			//src.out(0).on('open', done);
		});

		it('should pipe', function (done) {
			var src = new UnitFile.Src(foobar);
			var sink = new UnitFile.Sink(copy);

			src.out(0).on('open', function() {
				Unit.link(src, sink);
			});

			sink.on('finish', function() {done();});

		});

		after(function() {
		    fs.unlinkSync(copy);
  		});

	});
});

describe("UnitMP4Mux", function() {

	describe("constructor", function() {
		it('should initialize', function () {
			var unitMp4Mux = new UnitMP4Mux();
		});
	});
});