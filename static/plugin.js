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


// 渲染 REC dom
function renderREC() {
    var el = document.createElement('div')
        el.innerHTML = `
            <div class="rec-wrapper" onclick="plugin.stop(); renderVIEW();">REC
                <img src="data:image/png;base64,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" />
            </div>
        `
    var parentNode = document.querySelector('.stage-wrapper_stage-canvas-wrapper_3ewmd')
        parentNode.style = 'position: relative'
        parentNode.insertBefore(el.children[0], parentNode.children[0])
}


// 移除 REC dom
function destroyREC() {
    var parentNode = document.querySelector('.stage-wrapper_stage-canvas-wrapper_3ewmd')
        parentNode.style = ''
        parentNode.removeChild(parentNode.children[0])
}


// 渲染 VIEW dom
function renderVIEW() {
    var el = document.createElement('div')
        el.innerHTML = `
            <div class="view-mask">
                <div class="view-wrapper">
                    <div class="header">录制完成</div>
                    <div class="body">
                        <audio autoplay></audio>
                        <video autoplay poster="https://wpamelia.com/wp-content/uploads/2018/11/ezgif-2-6d0b072c3d3f.gif"></video>
                    </div>
                    <div class="footer">
                        <span>放弃</span>
                        <span>发布</span>
                    </div>
                </div>
            </div>
        `
    var parentNode = document.querySelector('body')
        parentNode.insertBefore(el.children[0], parentNode.children[0])
		setTimeout(() => { document.querySelector('audio').src = URL.createObjectURL(_audio); document.querySelector('video').src = URL.createObjectURL(_video.compile()); }, 1000)
}


// 移除 VIEW dom
function destroyVIEW() {
    var parentNode = document.querySelector('body')
        parentNode.removeChild(parentNode.children[0])
}