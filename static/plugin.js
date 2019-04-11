/*
	var vid = new Whammy.Video();
	vid.add(canvas or data url)
	vid.compile()
*/


var Whammy = (function(){
	// in this case, frames has a very specific meaning, which will be 
	// detailed once i finish writing the code

	function toWebM(frames){
		var info = checkFrames(frames);
		var counter = 0;
		var EBML = [
			{
				"id": 0x1a45dfa3, // EBML
				"data": [
					{ 
						"data": 1,
						"id": 0x4286 // EBMLVersion
					},
					{ 
						"data": 1,
						"id": 0x42f7 // EBMLReadVersion
					},
					{ 
						"data": 4,
						"id": 0x42f2 // EBMLMaxIDLength
					},
					{ 
						"data": 8,
						"id": 0x42f3 // EBMLMaxSizeLength
					},
					{ 
						"data": "webm",
						"id": 0x4282 // DocType
					},
					{ 
						"data": 2,
						"id": 0x4287 // DocTypeVersion
					},
					{ 
						"data": 2,
						"id": 0x4285 // DocTypeReadVersion
					}
				]
			},
			{
				"id": 0x18538067, // Segment
				"data": [
					{ 
						"id": 0x1549a966, // Info
						"data": [
							{  
								"data": 1e6, //do things in millisecs (num of nanosecs for duration scale)
								"id": 0x2ad7b1 // TimecodeScale
							},
							{ 
								"data": "whammy",
								"id": 0x4d80 // MuxingApp
							},
							{ 
								"data": "whammy",
								"id": 0x5741 // WritingApp
							},
							{ 
								"data": doubleToString(info.duration),
								"id": 0x4489 // Duration
							}
						]
					},
					{
						"id": 0x1654ae6b, // Tracks
						"data": [
							{
								"id": 0xae, // TrackEntry
								"data": [
									{  
										"data": 1,
										"id": 0xd7 // TrackNumber
									},
									{ 
										"data": 1,
										"id": 0x63c5 // TrackUID
									},
									{ 
										"data": 0,
										"id": 0x9c // FlagLacing
									},
									{ 
										"data": "und",
										"id": 0x22b59c // Language
									},
									{ 
										"data": "V_VP8",
										"id": 0x86 // CodecID
									},
									{ 
										"data": "VP8",
										"id": 0x258688 // CodecName
									},
									{ 
										"data": 1,
										"id": 0x83 // TrackType
									},
									{
										"id": 0xe0,  // Video
										"data": [
											{
												"data": info.width,
												"id": 0xb0 // PixelWidth
											},
											{ 
												"data": info.height,
												"id": 0xba // PixelHeight
											}
										]
									}
								]
							}
						]
					},
					{
						"id": 0x1f43b675, // Cluster
						"data": [
							{  
								"data": 0,
								"id": 0xe7 // Timecode
							}
						].concat(frames.map(function(webp){
							var block = makeSimpleBlock({
								discardable: 0,
								frame: webp.data.slice(4),
								invisible: 0,
								keyframe: 1,
								lacing: 0,
								trackNum: 1,
								timecode: Math.round(counter)
							});
							counter += webp.duration;
							return {
								data: block,
								id: 0xa3
							};
						}))
					}
				]
			}
		];
		return generateEBML(EBML)
	}

	// sums the lengths of all the frames and gets the duration, woo

	function checkFrames(frames){
		var width = frames[0].width, 
			height = frames[0].height, 
			duration = frames[0].duration;
		for(var i = 1; i < frames.length; i++){
			if(frames[i].width != width) throw "Frame " + (i + 1) + " has a different width";
			if(frames[i].height != height) throw "Frame " + (i + 1) + " has a different height";
			if(frames[i].duration < 0) throw "Frame " + (i + 1) + " has a weird duration";
			duration += frames[i].duration;
		}
		return {
			duration: duration,
			width: width,
			height: height
		};
	}


	function numToBuffer(num){
		var parts = [];
		while(num > 0){
			parts.push(num & 0xff)
			num = num >> 8
		}
		return new Uint8Array(parts.reverse());
	}

	function strToBuffer(str){
		// return new Blob([str]);

		var arr = new Uint8Array(str.length);
		for(var i = 0; i < str.length; i++){
			arr[i] = str.charCodeAt(i)
		}
		return arr;
		// this is slower
		// return new Uint8Array(str.split('').map(function(e){
		// 	return e.charCodeAt(0)
		// }))
	}



	//sorry this is ugly, and sort of hard to understand exactly why this was done
	// at all really, but the reason is that there's some code below that i dont really
	// feel like understanding, and this is easier than using my brain.

	function bitsToBuffer(bits){
		var data = [];
		var pad = (bits.length % 8) ? (new Array(1 + 8 - (bits.length % 8))).join('0') : '';
		bits = pad + bits;
		for(var i = 0; i < bits.length; i+= 8){
			data.push(parseInt(bits.substr(i,8),2))
		}
		return new Uint8Array(data);
	}

	function generateEBML(json){
		var ebml = [];
		for(var i = 0; i < json.length; i++){
			var data = json[i].data;
			// console.log(data);
			if(typeof data == 'object') data = generateEBML(data);
			if(typeof data == 'number') data = bitsToBuffer(data.toString(2));
			if(typeof data == 'string') data = strToBuffer(data);
			// console.log(data)

			var len = data.size || data.byteLength;
			var zeroes = Math.ceil(Math.ceil(Math.log(len)/Math.log(2))/8);
			var size_str = len.toString(2);
			var padded = (new Array((zeroes * 7 + 7 + 1) - size_str.length)).join('0') + size_str;
			var size = (new Array(zeroes)).join('0') + '1' + padded;
			
			//i actually dont quite understand what went on up there, so I'm not really
			//going to fix this, i'm probably just going to write some hacky thing which
			//converts that string into a buffer-esque thing

			ebml.push(numToBuffer(json[i].id));
			ebml.push(bitsToBuffer(size));
			ebml.push(data)
			

		}
		return new Blob(ebml, {
			type: "video/webm"
		});
	}

	//OKAY, so the following two functions are the string-based old stuff, the reason they're
	//still sort of in here, is that they're actually faster than the new blob stuff because
	//getAsFile isn't widely implemented, or at least, it doesn't work in chrome, which is the
	// only browser which supports get as webp

	//Converting between a string of 0010101001's and binary back and forth is probably inefficient
	//TODO: get rid of this function
	function toBinStr_old(bits){
		var data = '';
		var pad = (bits.length % 8) ? (new Array(1 + 8 - (bits.length % 8))).join('0') : '';
		bits = pad + bits;
		for(var i = 0; i < bits.length; i+= 8){
			data += String.fromCharCode(parseInt(bits.substr(i,8),2))
		}
		return data;
	}

	function generateEBML_old(json){
		var ebml = '';
		for(var i = 0; i < json.length; i++){
			var data = json[i].data;
			if(typeof data == 'object') data = generateEBML_old(data);
			if(typeof data == 'number') data = toBinStr_old(data.toString(2));
			
			var len = data.length;
			var zeroes = Math.ceil(Math.ceil(Math.log(len)/Math.log(2))/8);
			var size_str = len.toString(2);
			var padded = (new Array((zeroes * 7 + 7 + 1) - size_str.length)).join('0') + size_str;
			var size = (new Array(zeroes)).join('0') + '1' + padded;

			ebml += toBinStr_old(json[i].id.toString(2)) + toBinStr_old(size) + data;

		}
		return ebml;
	}

	//woot, a function that's actually written for this project!
	//this parses some json markup and makes it into that binary magic
	//which can then get shoved into the matroska comtainer (peaceably)

	function makeSimpleBlock(data){
		var flags = 0;
		if (data.keyframe) flags |= 128;
		if (data.invisible) flags |= 8;
		if (data.lacing) flags |= (data.lacing << 1);
		if (data.discardable) flags |= 1;
		if (data.trackNum > 127) {
			throw "TrackNumber > 127 not supported";
		}
		var out = [data.trackNum | 0x80, data.timecode >> 8, data.timecode & 0xff, flags].map(function(e){
			return String.fromCharCode(e)
		}).join('') + data.frame;

		return out;
	}

	// here's something else taken verbatim from weppy, awesome rite?

	function parseWebP(riff){
		var VP8 = riff.RIFF[0].WEBP[0];
		
		var frame_start = VP8.indexOf('\x9d\x01\x2a'); //A VP8 keyframe starts with the 0x9d012a header
		for(var i = 0, c = []; i < 4; i++) c[i] = VP8.charCodeAt(frame_start + 3 + i);
		
		var width, horizontal_scale, height, vertical_scale, tmp;
		
		//the code below is literally copied verbatim from the bitstream spec
		tmp = (c[1] << 8) | c[0];
		width = tmp & 0x3FFF;
		horizontal_scale = tmp >> 14;
		tmp = (c[3] << 8) | c[2];
		height = tmp & 0x3FFF;
		vertical_scale = tmp >> 14;
		return {
			width: width,
			height: height,
			data: VP8,
			riff: riff
		}
	}

	// i think i'm going off on a riff by pretending this is some known
	// idiom which i'm making a casual and brilliant pun about, but since
	// i can't find anything on google which conforms to this idiomatic
	// usage, I'm assuming this is just a consequence of some psychotic
	// break which makes me make up puns. well, enough riff-raff (aha a
	// rescue of sorts), this function was ripped wholesale from weppy

	function parseRIFF(string){
		var offset = 0;
		var chunks = {};
		
		while (offset < string.length) {
			var id = string.substr(offset, 4);
			var len = parseInt(string.substr(offset + 4, 4).split('').map(function(i){
				var unpadded = i.charCodeAt(0).toString(2);
				return (new Array(8 - unpadded.length + 1)).join('0') + unpadded
			}).join(''),2);
			var data = string.substr(offset + 4 + 4, len);
			offset += 4 + 4 + len;
			chunks[id] = chunks[id] || [];
			
			if (id == 'RIFF' || id == 'LIST') {
				chunks[id].push(parseRIFF(data));
			} else {
				chunks[id].push(data);
			}
		}
		return chunks;
	}

	// here's a little utility function that acts as a utility for other functions
	// basically, the only purpose is for encoding "Duration", which is encoded as
	// a double (considerably more difficult to encode than an integer)
	function doubleToString(num){
		return [].slice.call(
			new Uint8Array(
				(
					new Float64Array([num]) //create a float64 array
				).buffer) //extract the array buffer
			, 0) // convert the Uint8Array into a regular array
			.map(function(e){ //since it's a regular array, we can now use map
				return String.fromCharCode(e) // encode all the bytes individually
			})
			.reverse() //correct the byte endianness (assume it's little endian for now)
			.join('') // join the bytes in holy matrimony as a string
	}

	function WhammyVideo(speed, quality){ // a more abstract-ish API
		this.frames = [];
		this.duration = 1000 / (speed || 15);
		this.quality = quality || 0.8;
	}

	WhammyVideo.prototype.add = function(frame, duration){
		if(typeof duration != 'undefined' && this.duration) throw "you can't pass a duration if the fps is set";
		if('canvas' in frame){ //CanvasRenderingContext2D
			frame = frame.canvas;	
		}
		if('toDataURL' in frame){
			frame = frame.toDataURL('image/webp', this.quality)
		}else if(typeof frame != "string"){
			throw "frame must be a a HTMLCanvasElement, a CanvasRenderingContext2D or a DataURI formatted string"
		}
		if (!(/^data:image\/webp;base64,/ig).test(frame)) {
			throw "Input must be formatted properly as a base64 encoded DataURI of type image/webp";
		}
		this.frames.push({
			image: frame,
			duration: duration || this.duration
		})
	}
	
	WhammyVideo.prototype.compile = function(){
		return new toWebM(this.frames.map(function(frame){
			var webp = parseWebP(parseRIFF(atob(frame.image.slice(23))));
			webp.duration = frame.duration;
			return webp;
		}))
	}

	return {
		Video: WhammyVideo,
		fromImageArray: function(images, fps){
			return toWebM(images.map(function(image){
				var webp = parseWebP(parseRIFF(atob(image.slice(23))))
				webp.duration = 1000 / fps;
				return webp;
			}))
		},
		toWebM: toWebM
		// expose methods of madness
	}
})()


// 请使用指定浏览器提示语
if (navigator.userAgent.match('Chrome') === null) {
	alert('鲸小小温馨提示：为了更好的在线体验，请务必移驾到谷歌浏览器开发哦~ :)')
}


// 媒体插件集成
window.plugin = {
    start() {
        if (window._capture) return alert('鲸小小温馨提示：作品已经在录制中哦~ :)')
        renderREC()
        window._capture = true
        window._audio = new Blob()
        window._video = new Whammy.Video()
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            window._audioRecorder = new MediaRecorder(stream)
            window._audioRecorder.start()
            window._audioRecorder.ondataavailable = e => window._audio = e.data
        })
    },
    stop() {
        destroyREC()
        window._capture = false
        window._audioRecorder && window._audioRecorder.stop()
    },
}


// 媒体插件调试
document.documentElement.ondblclick = function () {
	if (localStorage.debug === 'true') {
        open(URL.createObjectURL(window._audio))
        open(URL.createObjectURL(window._video.compile()))
	}
}


// 渲染 dom rec
function renderREC() {
    var el = document.createElement('div')
        el.innerHTML = `
            <div class="rec-wrapper" onclick="plugin.stop(); renderALERT();">REC
				<img src="data:image/png;base64,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" />
            </div>
        `
    var parentNode = document.querySelector('.stage-wrapper_stage-canvas-wrapper_3ewmd')
        parentNode.style = 'position: relative'
        parentNode.insertBefore(el.children[0], parentNode.children[0])
}


// 移除 dom rec
function destroyREC() {
    var parentNode = document.querySelector('.stage-wrapper_stage-canvas-wrapper_3ewmd')
        parentNode.style = ''
        parentNode.removeChild(parentNode.children[0])
}


// 渲染 dom alert
function renderALERT() {
    var el = document.createElement('div')
        el.innerHTML = `
            <div class="alert-mask">
                <div class="alert-wrapper">
                    <div class="header">录制完成</div>
                    <div class="body">
                        <audio autoplay></audio>
                        <video autoplay poster="https://wpamelia.com/wp-content/uploads/2018/11/ezgif-2-6d0b072c3d3f.gif"></video>
                    </div>
                    <div class="footer">
                        <span onclick="destroyALERT()">放弃</span>
                        <span onclick="destroyALERT(); plugin.publish();">发布</span>
                    </div>
                </div>
            </div>
        `
    var parentNode = document.querySelector('body')
        parentNode.insertBefore(el.children[0], parentNode.children[0])
        setTimeout(() => { document.querySelector('audio').src = URL.createObjectURL(_audio); document.querySelector('video').src = URL.createObjectURL(_video.compile()); }, 1000)
}


// 移除 dom alert
function destroyALERT() {
    var parentNode = document.querySelector('body')
        parentNode.removeChild(parentNode.children[0])
}


/*
this._drawThese(this._drawList, ShaderManager.DRAW_MODE.default, this._projection);

// 媒体插件集成
if (window) {
	window._poster = gl.canvas.toDataURL('image/webp');
}

// 媒体插件集成
if (window._capture) {
	window._video.add(gl.canvas);
	window._video.poster = gl.canvas.toDataURL('image/webp');
}

*/