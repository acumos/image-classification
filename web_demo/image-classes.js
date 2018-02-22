/*
  ===============LICENSE_START=======================================================
  Acumos Apache-2.0
  ===================================================================================
  Copyright (C) 2017-2018 AT&T Intellectual Property & Tech Mahindra. All rights reserved.
  ===================================================================================
  This Acumos software file is distributed by AT&T and Tech Mahindra
  under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
 
  http://www.apache.org/licenses/LICENSE-2.0
 
  This file is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
  ===============LICENSE_END=========================================================
*/
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
    var urlDefault = getUrlParameter('url-image');
    if (!urlDefault)
        urlDefault = "http://localhost:8885/classify";

	$(document.body).data('hdparams', {	// store global vars in the body element
		classificationServerFirewallRoot: "http://135.207.105.218:8100",   // Renders HTML for file upload
		classificationServerFirewall: "http://135.207.105.218:8100/upload",
		classificationServer: urlDefault,
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

	//add text input tweak
	$("#serverUrl").change(function() {
	    $(document.body).data('hdparams')['classificationServer'] = $(this).val();
        updateLink("serverLink");
	}).val($(document.body).data('hdparams')['classificationServer'])
	//set launch link at first
    updateLink("serverLink");

	// add buttons to change video
	$.each(videos, function(key) {
		var button = $('<button/>').text(videos[key].name).click(function() { switchVideo(key, '#resultsDiv'); });
		$("#videoSelector").append(button);
	});
});

function updateLink(domId) {
    var sPageURL = decodeURIComponent(window.location.search.split('?')[0]);
    var newServer = $(document.body).data('hdparams')['classificationServer'];
    var sNewUrl = sPageURL+"?url-image="+newServer;
//    if (typeof(newServer)==string) {
        $("#"+domId).attr('href', sNewUrl);
//    }
}

// https://stackoverflow.com/questions/19491336/get-url-parameter-jquery-or-how-to-get-query-string-values-in-js
function getUrlParameter(sParam) {
    var sPageURL = decodeURIComponent(window.location.search.substring(1)),
        sURLVariables = sPageURL.split('&'),
        sParameterName,
        i;

    for (i = 0; i < sURLVariables.length; i++) {
        sParameterName = sURLVariables[i].split('=');

        if (sParameterName[0] === sParam) {
            return sParameterName[1] === undefined ? true : sParameterName[1];
        }
    }
};

/**
 * Change the video source and restart
 */
function switchVideo(n, resultDiv) {
	var hd = $(document.body).data('hdparams');
    $(resultDiv).empty().append($("<div class='header'>Image Classification</div>"));

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
	hd.imageIsWaiting = false;
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

    $(dstDiv).append($("<div>&nbsp;</div>").addClass('spinner'));

	var fd = new FormData();
	if (true) { // hd.serverIsLocal) {
	    serviceURL = hd.classificationServer;
        fd.append("image_binary", blob);
        fd.append("mime_type", "image/jpeg");
	}
	else {      //disabled now for direct URL specification
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

    if ('results' in data) {
        $.each(data.results.tags, function(k, v) {
            if (count < limit && v.score >= minScore) {
                var fade = (v.score > 1.0) ? 1 : v.score;	// fade out low confidence classes
                classTable.append($('<tr />').css('opacity', fade)
                    .append($('<td />').append(v.tag))
                    .append($('<td />').append(parseFloat(v.score).toFixed(2)))
                    );
                count++;
            }
        });
    }
    else {  //expecting flat data
        $.each(data, function(i,v) {
            if (count < limit && v.score >= minScore) {
                var fade = (v.score > 1.0) ? 1 : v.score;	// fade out low confidence classes
                classTable.append($('<tr />').css('opacity', fade)
                    .append($('<td />').append(v.tag))
                    .append($('<td />').append(parseFloat(v.score).toFixed(2)))
                    );
                count++;
            }
        });
    }

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

