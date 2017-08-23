/**
 image-classes.js - send frames to an image classification service

 Videos or camera are displayed locally and frames are periodically sent to GPU image-net classifier service (developed by Zhu Liu) via http post.
 For webRTC, See: https://gist.github.com/greenido/6238800
 
 D. Gibbon 6/3/15
 D. Gibbon 4/19/17 updated to new getUserMedia api, https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
 D. Gibbon 8/1/17 adapted for Cognita
 */
 
"use strict";

/**
 * main entry point
 */
$(document).ready(function() {
	$(document.body).data('hdparams', {	// store global vars in the body element
		classificationServerFirewallRoot: "http://135.207.105.218:8100",   // Renders HTML for file upload
		classificationServerFirewall: "http://135.207.105.218:8100/upload",
		classificationServerLocalhost: "http://localhost:8885/transform",
		frameCounter: 0,
		totalFrames: 900000,	// stop after this many frames just to avoid sending frames forever if someone leaves page up
		frameInterval: 500,		// Milliseconds to sleep between sending frames to reduce server load and reduce results updates
		frameTimer: -1,		// frame clock for processing
		maxSrcVideoWidth: 512,	// maximum image width for processing
		serverIsLocal: true,    // server is local versus 'firewall' version
		imageIsWaiting: false,  // blocking to prevent too many queued frames
		// Objects from DOM elements
		video: document.getElementById('srcVideo'),
		srcImgCanvas: document.getElementById('srcImgCanvas'),	// we have a 'src' source image 
	});

	var hd = $(document.body).data('hdparams');
	//$('#serviceLink').attr("href", hd.classificationServerFirewallRoot);
	hd.video.addEventListener("loadedmetadata", newVideo);

	//add checkbox tweak
	$("#serverToggle").change(function() {
	    var valLast = $(document.body).data('hdparams')['serverIsLocal'];
	    $(document.body).data('hdparams')['serverIsLocal'] = !valLast;
	}).attr("checked", "checked" ? $(document.body).data('hdparams')['serverIsLocal'] : "")

	// add buttons to change video
	$.each(videos, function(key) {
		var button = $('<button/>').text(videos[key].name).click(function() { switchVideo(key); });
		$("#videoSelector").append(button);
	});
});


/**
 * Change the video source and restart
 */
function switchVideo(n) {
	var hd = $(document.body).data('hdparams');

	if (n >= videos.length) n = 0;
	clearInterval(hd.frameTimer);	// stop the processing

	// Set the video source based on URL specified in the 'videos' list, or select camera input
	if (videos[n].name == "Camera") {
		var constraints = {audio: false, video: true};
		navigator.mediaDevices.getUserMedia(constraints)
			.then(function(mediaStream) {
				hd.video.srcObject = mediaStream;
				hd.video.play();
			})
			.catch(function(err) {
				console.log(err.name + ": " + err.message);
			});
	} else {
		var mp4 = document.getElementById("mp4");
		mp4.setAttribute("src", videos[n].url);
		hd.video.load();
	}
}

/**
 * Called after a new video has loaded (at least the video metadata has loaded)
 */
function newVideo() {
	var hd = $(document.body).data('hdparams');
	hd.frameCounter = 0;
	hd.video.play();

	// set processing canvas size based on source video
	var pwidth = hd.video.videoWidth;
	var pheight = hd.video.videoHeight;
	if (pwidth > hd.maxSrcVideoWidth) {
		pwidth = hd.maxSrcVideoWidth;
		pheight = Math.floor((pwidth / hd.video.videoWidth) * pheight);	// preserve aspect ratio
	}
	hd.srcImgCanvas.width = pwidth;
	hd.srcImgCanvas.height = pheight;

	hd.frameTimer = setInterval(nextFrame, hd.frameInterval); // start the processing
}

/** 
 * process the next video frame
 */
function nextFrame() {
	var hd = $(document.body).data('hdparams');
	if (hd.totalFrames < hd.frameCounter || hd.video.ended || hd.video.paused) {
		return;
	}
	var srcImgContext = hd.srcImgCanvas.getContext('2d');
	var w = hd.srcImgCanvas.width;
	var h = hd.srcImgCanvas.height;
	srcImgContext.drawImage(hd.video, 0, 0, w, h);
	if (!hd.imageIsWaiting) {
        doPostImage(hd.srcImgCanvas, '#resultsDiv');
        hd.frameCounter++;
    }
}

/**
 * post an image from the canvas to the service
 */
function doPostImage(srcCanvas, dstDiv) {
	var serviceURL = "";
	var dataURL = srcCanvas.toDataURL('image/jpeg', 0.5);
	var blob = dataURItoBlob(dataURL);
	var hd = $(document.body).data('hdparams');
	var fd = new FormData();
	if (hd.serverIsLocal) {
	    serviceURL = hd.classificationServerLocalhost;
        fd.append("image_binary", blob);
        fd.append("mime_type", "image/jpeg");
	}
	else {
	    serviceURL = hd.classificationServerFirewall;
        fd.append("myFile", blob);
        fd.append("rtnformat", "json");
        fd.append("myList", "5");	// limit the number of classes (max 1000)
	}
	var request = new XMLHttpRequest();
	hd.imageIsWaiting = true;
	request.onreadystatechange=function() {
		if (request.readyState==4 && request.status==200) {
			genClassTable($.parseJSON(request.responseText), dstDiv);
			hd.imageIsWaiting = false;
		}
	}
	request.open("POST", serviceURL, true);
	request.send(fd);
}

/**
 * create markup for a list of classifications
 */
function genClassTable (data, div) {
	var count = 0;
	var limit = 100;
	var minScore = 0.1; // don't display any scores less than this
	$(div).empty();
	var classTable = $('<table />').append($('<tr />')
				.append($('<th />').append('Class'))
				.append($('<th />').append('Score'))
				);

	$.each(data.results.classes, function(k, v) {
		if (count < limit && v.score >= minScore) {
			var fade = (v.score > 1.0) ? 1 : v.score;	// face out low confidence classes
			classTable.append($('<tr />').css('opacity', fade)
				.append($('<td />').append(v.class))
				.append($('<td />').append(parseFloat(v.score).toFixed(2)))
				);
			count++;
		}
	});
	$(div).append(classTable);
}

/**
 * convert base64/URLEncoded data component to raw binary data held in a string
 *
 * Stoive, http://stackoverflow.com/questions/4998908/convert-data-uri-to-file-then-append-to-formdata
 */
function dataURItoBlob(dataURI) {
    // convert base64/URLEncoded data component to raw binary data held in a string
    var byteString;
    if (dataURI.split(',')[0].indexOf('base64') >= 0)
        byteString = atob(dataURI.split(',')[1]);
    else
        byteString = unescape(dataURI.split(',')[1]);

    // separate out the mime component
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

    // write the bytes of the string to a typed array
    var ia = new Uint8Array(byteString.length);
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    return new Blob([ia], {type:mimeString});
}

