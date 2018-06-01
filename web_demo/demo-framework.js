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
 face-privacy.js - send frames to an face privacy service; clone from image-classes.js

 Videos or camera are displayed locally and frames are periodically sent to GPU image-net classifier service (developed by Zhu Liu) via http post.
 For webRTC, See: https://gist.github.com/greenido/6238800

 D. Gibbon 6/3/15
 D. Gibbon 4/19/17 updated to new getUserMedia api, https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
 D. Gibbon 8/1/17 adapted for system
 E. Zavesky 10/19/17 adapted for video+image
 E. Zavesky 05/05/18 adapted for row-based image and other results
 E. Zavesky 05/30/18 adapted for single image input, github preview, safe posting (forked from model-specific code)
 */


/**
 * main entry point
 */
function demo_init(objSetting) {
    if (!objSetting) objSetting = {};

    // clone/extend the default input from our main script
    $(document.body).data('hdparams', $.extend(true, objSetting, {	// store global vars in the body element
        classificationServer: getUrlParameter('url-image'), // default to what's in our url prameter
        protoObj: null,   // to be back-filled after protobuf load {'root':obj, 'methods':{'xx':{'typeIn':x, 'typeOut':y}} }
        protoPayloadInput: null,   //payload for encoded message download (if desired)
        protoPayloadOutput: null,   //payload for encoded message download (if desired)
        frameCounter: 0,
        totalFrames: 900000,	// stop after this many frames just to avoid sending frames forever if someone leaves page up
        frameInterval: 500,		// Milliseconds to sleep between sending frames to reduce server load and reduce results updates
        frameTimer: -1,		// frame clock for processing
        maxSrcVideoWidth: 512,	// maximum image width for processing
        serverIsLocal: true,    // server is local versus 'firewall' version
        imageIsWaiting: false,  // blocking to prevent too many queued frames
        // functional customizations for each demo
        documentTitle: "Protobuf Demo",
        mediaList: [],        //relative URLs of media files
        protoList: [],        //relative URLs of proto files to include
        // Objects from DOM elements
        video: document.getElementById('srcVideo'),
        srcImgCanvas: document.getElementById('srcImgCanvas'),	// we have a 'src' source image
    }));

    var hd = $(document.body).data('hdparams');
    hd.video.addEventListener("loadedmetadata", newVideo);

    $("#protoInput").prop("disabled",true).click(downloadBlobIn);
    $("#protoOutput").prop("disabled",true).click(downloadBlobOut);
    $("#resultText").hide();

    //add text input tweak
    $("#serverUrl").change(function() {
        $(document.body).data('hdparams')['classificationServer'] = $(this).val();
        updateLink("serverLink");
    }).val($(document.body).data('hdparams')['classificationServer'])
    //set launch link at first
    updateLink("serverLink");

    //if protobuf is enabled, fire load event for it as well
    hd.protoObj = {};  //clear from last load
    $.each(hd.protoList, function(idx, protoTuple) {     //load relevant protobuf tuples
        protobuf_load.apply(this, protoTuple);      //load each file independently
    });

    // add buttons to change video
    $.each(hd.mediaList, function(key) {
        //TODO: integrarte as DIV instead of button
        var button = $('<button/>').text(videos[key].name).attr('movie', videos[key].url);
        $("#sourceRibbon").append(button);
    });

    // add buttons to change video
	$("#sourceRibbon").children().click(function() {
        var $this = $(this);
        $this.siblings().removeClass('selected'); //clear other selection
        $this.addClass('selected');
        var objImg = $this.children('img')[0];
        var movieAttr = $this.attr('movie');
        var hd = $(document.body).data('hdparams');
        if (objImg) {
            movieAttr = $(objImg).attr('movie');
            switchImage(objImg.src);
            clearInterval(hd.frameTimer);	// stop the processing
        }
        if (movieAttr) {
            // Set the video source based on URL specified in the 'videos' list, or select camera input
            $(hd.video).show();
            $(srcImgCanvas).hide();
            if (movieAttr == "Camera") {
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
                mp4.setAttribute("src", movieAttr);
                hd.video.load();
                newVideo();
            }
        }
        else {
            hd.video.pause();
            $(hd.video).hide();
            $(srcImgCanvas).show();
        }
	});


    //trigger first click
    $("#sourceRibbon").children()[0].click();
}


function protobuf_load(pathProto, forceSelect) {
    protobuf.load(pathProto, function(err, root) {
        if (err) {
            console.log("[protobuf]: Error!: "+err);
            throw err;
        }
        var domSelect = $("#protoMethod");
        var numMethods = domSelect.children().length;
        $.each(root.nested, function(namePackage, objPackage) {    // walk all
            if ('Model' in objPackage && 'methods' in objPackage.Model) {    // walk to model and functions...
                var typeSummary = {'root':root, 'methods':{} };
                $.each(objPackage.Model.methods, function(nameMethod, objMethod) {  // walk methods
                    typeSummary['methods'][nameMethod] = {};
                    typeSummary['methods'][nameMethod]['typeIn'] = namePackage+'.'+objMethod.requestType;
                    typeSummary['methods'][nameMethod]['typeOut'] = namePackage+'.'+objMethod.responseType;
                    typeSummary['methods'][nameMethod]['service'] = namePackage+'.'+nameMethod;

                    //create HTML object as well
                    var namePretty = namePackage+"."+nameMethod;
                    var domOpt = $("<option />").attr("value", namePretty).text(
                        nameMethod+ " (input: "+objMethod.requestType
                        +", output: "+objMethod.responseType+")");
                    if (numMethods==0) {    // first method discovery
                        domSelect.append($("<option />").attr("value","").text("(disabled, not loaded)")); //add 'disabled'
                    }
                    if (forceSelect) {
                        domOpt.attr("selected", 1);
                    }
                    domSelect.append(domOpt);
                    numMethods++;
                });
                $(document.body).data('hdparams').protoObj[namePackage] = typeSummary;   //save new method set
                $("#protoContainer").show();
            }
        });
        console.log("[protobuf]: Load successful, found "+numMethods+" model methods.");
    });
}

// modify the link and update our url
function updateLink(domId) {
    var newServer = $(document.body).data('hdparams')['classificationServer'];
    var sNewUrl = updateQueryStringParameter(window.location.href, "url-image", newServer, "?");
    $("#"+domId).attr('href', sNewUrl);
    //window.history.pushState({}, $(document.body).data('hdparams')['documentTitle'], sNewUrl);
}

// https://stackoverflow.com/a/6021027
function updateQueryStringParameter(uri, key, value, separator) {
    var re = new RegExp("([?&])" + key + "=.*?(&|$)", "i");
    if (uri.match(re)) {
        return uri.replace(re, '$1' + key + "=" + value + '$2');
    }
    if (!separator) //allow forced/override
       separator = uri.indexOf('?') !== -1 ? "&" : "?";
    return uri + separator + key + "=" + value;
}

// https://stackoverflow.com/a/3354511
window.onpopstate = function(e){
    if(e.state){
        //document.getElementById("content").innerHTML = e.state.html;
        $(document.body).data('hdparams')['documentTitle'] = e.state.pageTitle;
    }
};

function getUrlParameter(key) {
    var re = new RegExp("([?&])" + key + "=(.*?)(&|$)", "i");
    var match = window.location.search.match(re)
    if (match) {
        //console.log(match);
        return match[match.length-2];
    }
};

/**
 * Change the video source and restart
 */
function switchVideo(n, resultDiv, attrDiv) {
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
        $(attrDiv).empty();
	} else {
		var mp4 = document.getElementById("mp4");
		mp4.setAttribute("src", videos[n].url);
         $(attrDiv).empty();
         if (videos[n].source != undefined) {
             $(attrDiv).append($("<a href='"+videos[n].source+"' target='_new'>Video Source: "+videos[n].name+"</a>"));
         }
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
	if (hd.video.ended || hd.video.paused) {
		return;
	}
    switchImage(hd.video, true);
}

function switchImage(imgSrc, isVideo) {
    var canvas = $(document.body).data('hdparams')['srcImgCanvas'];
    if (!isVideo) {
        var img = new Image();
        img.onload = function () {
            var ctx = canvas.getContext('2d');
            var canvasCopy = document.createElement("canvas");
            var copyContext = canvasCopy.getContext("2d");

            var ratio = 1;

            //console.log( $(document.body).data('hdparams'));
            //console.log( [ img.width, img.height]);
            // https://stackoverflow.com/a/2412606
            if(img.width > $(document.body).data('hdparams')['canvasMaxW'])
                ratio = $(document.body).data('hdparams')['canvasMaxW'] / img.width;
            if(ratio*img.height > $(document.body).data('hdparams')['canvasMaxH'])
                ratio = $(document.body).data('hdparams')['canvasMaxH'] / img.height;

            canvasCopy.width = img.width;
            canvasCopy.height = img.height;
            copyContext.drawImage(img, 0, 0);

            canvas.width = img.width * ratio;
            canvas.height = img.height * ratio;
            ctx.drawImage(canvasCopy, 0, 0, canvasCopy.width, canvasCopy.height, 0, 0, canvas.width, canvas.height);
            //document.removeChild(canvasCopy);
            doPostImage(canvas, '#resultsDiv', '#destImg', canvas.toDataURL());
        }
        img.src = imgSrc;  //copy source, let image load
    }
    else if (!$(document.body).data('hdparams').imageIsWaiting) {
        var ctx = canvas.getContext('2d');
        var canvasCopy = document.createElement("canvas");
        var copyContext = canvasCopy.getContext("2d");
        var ratio = 1;

        if(imgSrc.videoWidth > $(document.body).data('hdparams')['canvasMaxW'])
            ratio = $(document.body).data('hdparams')['canvasMaxW'] / imgSrc.videoWidth;
        if(ratio*imgSrc.videoHeight > $(document.body).data('hdparams')['canvasMaxH'])
            ratio = $(document.body).data('hdparams')['canvasMaxH'] / canvasCopy.height;

        //console.log("Canvas Copy:"+canvasCopy.width+"/"+canvasCopy.height);
        //console.log("Canvas Ratio:"+ratio);
        //console.log("Video: "+imgSrc.videoWidth+"x"+imgSrc.videoHeight);
        canvasCopy.width = imgSrc.videoWidth;     //large as possible
        canvasCopy.height = imgSrc.videoHeight;
        copyContext.drawImage(imgSrc, 0, 0);

        canvas.width = canvasCopy.width * ratio;
        canvas.height = canvasCopy.height * ratio;
        ctx.drawImage(canvasCopy, 0, 0, canvasCopy.width, canvasCopy.height, 0, 0, canvas.width, canvas.height);
        //document.removeChild(canvasCopy);
        doPostImage(canvas, '#resultsDiv', '#destImg', canvas.toDataURL());
    }
}


/**
 * post an image from the canvas to the service
 */
function doPostImage(srcCanvas, dstDiv, dstImg, imgPlaceholder) {
    var dataURL = srcCanvas.toDataURL('image/jpeg', 1.0);
    var hd = $(document.body).data('hdparams');
    var sendPayload = null;

    var nameProtoMethod = $("#protoMethod option:selected").attr('value');
    var methodKeys = null;
    if (nameProtoMethod && nameProtoMethod.length) {     //valid protobuf type?
        var partsURL = hd.classificationServer.split("/");
        methodKeys = nameProtoMethod.split(".", 2);       //modified for multiple detect/pixelate models
        partsURL[partsURL.length-1] = methodKeys[1];
        hd.classificationServer = partsURL.join("/");   //rejoin with new endpoint
        updateLink("serverLink", hd.classificationServer);
    }

    hd.imageIsWaiting = true;
    var domHeaders = {};
    dstDiv = $(dstDiv);
    dstDiv.append($("<div>&nbsp;</div>").addClass('spinner'));
    if (dstImg)     //convert to jquery dom object
        dstImg = $(dstImg);

    //console.log("[doPostImage]: Selected method ... '"+typeInput+"'");
    if (nameProtoMethod && nameProtoMethod.length) {     //valid protobuf type?
        var blob = dataURItoBlob(dataURL, true);

        // fields from .proto file at time of writing...
        // message Image {
        //   string mime_type = 1;
        //   bytes image_binary = 2;
        // }

        //TODO: should we always assume this is input? answer: for now, YES, always image input!
        var inputPayload = { "mimeType": blob.type, "imageBinary": blob.bytes };

        // ---- method for processing from a type ----
        var msgInput = hd.protoObj[methodKeys[0]]['root'].lookupType(hd.protoObj[methodKeys[0]]['methods'][methodKeys[1]]['typeIn']);
        // Verify the payload if necessary (i.e. when possibly incomplete or invalid)
        var errMsg = msgInput.verify(inputPayload);
        if (errMsg) {
            var strErr = "[doPostImage]: Error during type verify for object input into protobuf method. ("+errMsg+")";
            dstDiv.empty().html(strErr);
            console.log(strErr);
            throw Error(strErr);
        }
        // Create a new message
        var msgTransmit = msgInput.create(inputPayload);
        // Encode a message to an Uint8Array (browser) or Buffer (node)
        sendPayload = msgInput.encode(msgTransmit).finish();

        //downloadBlob(sendPayload, 'protobuf.bin', 'application/octet-stream');
        // NOTE: TO TEST THIS BINARY BLOB, use some command-line magic like this...
        //  protoc --decode=mMJuVapnmIbrHlZGKyuuPDXsrkzpGqcr.FaceImage model.proto < protobuf.bin
        $("#protoInput").prop("disabled",false);
        hd.protoPayloadInput = sendPayload;

        //request.setRequestHeader("Content-type", "application/octet-stream;charset=UTF-8");
        domHeaders["Content-type"] = "text/plain;charset=UTF-8";
        //request.responseType = 'arraybuffer';
    }
    else if (hd.protoList.length) {
        var strErr = "[doPostImage]: Proto method expected but unavailable in POST, aborting send.";
        console.log(strErr);
        throw Error(strErr);
    }
    else {
        var blob = dataURItoBlob(dataURL, false);
        sendPayload = new FormData();
        if (hd.serverIsLocal) {
            serviceURL = hd.classificationServer;
            sendPayload.append("image_binary", blob);
            sendPayload.append("mime_type", blob.type);
        }
        else {      //disabled now for direct URL specification
            serviceURL = hd.classificationServerFirewall;
            sendPayload.append("myFile", blob);
            sendPayload.append("rtnformat", "json");
            sendPayload.append("myList", "5");	// limit the number of classes (max 1000)
        }
    }

    //$(dstImg).addClaas('workingImage').siblings('.spinner').remove().after($("<span class='spinner'>&nbsp;</span>"));
    $.ajax({
        type: 'POST',
        url: hd.classificationServer,
        data: sendPayload,
        crossDomain: true,
        dataType: 'native',
        xhrFields: {
            responseType: 'arraybuffer'
        },
        processData: false,
        headers: domHeaders,
        error: function (data, textStatus, errorThrown) {
            //console.log(textStatus);
            var errStr = "Error: Failed javascript POST (err: "+textStatus+","+errorThrown+")";
            console.log(errStr);
            dstDiv.html(errStr);
            hd.imageIsWaiting = false;
            return false;
        },
        success: function(data, textStatus, jqXHR) {
            // what do we do with a good processing result?
            //
            //  data: the raw body from the response
            //  dstImg: the dom element of a destination image
            //  methodKeys: which protomethod was selected
            //  dstImg: the dom element of a destination image (if available)
            //  imgPlaceholder: the exported canvas image from last source
            //
            var returnState = processResult(data, dstDiv, methodKeys, dstImg, imgPlaceholder);
            hd.imageIsWaiting = false;
            return returnState;
        }
	});
}

/**
 * convert base64/URLEncoded data component to raw binary data held in a string
 *
 * Stoive, http://stackoverflow.com/questions/4998908/convert-data-uri-to-file-then-append-to-formdata
 */
function dataURItoBlob(dataURI, wantBytes) {
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
    //added for returning bytes directly
    if (wantBytes) {
        return {'bytes':ia, 'type':mimeString};
    }
    return new Blob([ia], {type:mimeString});
}

// https://stackoverflow.com/a/12713326
function Uint8ToString(u8a){
  var CHUNK_SZ = 0x8000;
  var c = [];
  for (var i=0; i < u8a.length; i+=CHUNK_SZ) {
    c.push(String.fromCharCode.apply(null, u8a.subarray(i, i+CHUNK_SZ)));
  }
  return c.join("");
}

function BlobToDataURI(data, mime) {
    var b64encoded = btoa(Uint8ToString(data));
    return "data:"+mime+";base64,"+b64encoded;
}

// ----- diagnostic tool to download binary blobs ----
function downloadBlobOut() {
    return downloadBlob($(document.body).data('hdparams').protoPayloadOutput, "protobuf.out.bin");
}

function downloadBlobIn() {
    return downloadBlob($(document.body).data('hdparams').protoPayloadInput, "protobuf.in.bin");
}

//  https://stackoverflow.com/a/33622881
function downloadBlob(data, fileName, mimeType) {
    //if there is no data, filename, or mime provided, make our own
    if (!data)
        data = $(document.body).data('hdparams').protoPayloadInput;
    if (!fileName)
        fileName = "protobuf.bin";
    if (!mimeType)
        mimeType = "application/octet-stream";

    var blob, url;
    blob = new Blob([data], {
        type: mimeType
    });
    url = window.URL.createObjectURL(blob);
    downloadURL(url, fileName, mimeType);
    setTimeout(function() {
        return window.URL.revokeObjectURL(url);
    }, 1000);
};

function downloadURL(data, fileName) {
    var a;
    a = document.createElement('a');
    a.href = data;
    a.download = fileName;
    document.body.appendChild(a);
    a.style = 'display: none';
    a.click();
    a.remove();
};


//load image that has been uploaded into a canvas
function handleImage(e){
    var reader = new FileReader();
    reader.onload = function(event){
        switchImage(event.target.result);
    }
    reader.readAsDataURL(e.target.files[0]);
}


