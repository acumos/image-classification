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
 E. Zavesky 07/11/18 allow proto type grouping, proto text file download, binary chunk upload (as proto)
 E. Zavesky 07/27/18 update for use of video list for auto-population of ribbon with div, not image; add rect drawing function
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
        protoInputName: 'in',  //input name for proto creation
        protoPayloadOutput: null,   //payload for encoded message download (if desired)
        protoOutputName: 'out',  //output name for proto download
        protoKeys: null,  // currently selected protobuf method (if any)
        frameCounter: 0,
        totalFrames: 900000,	// stop after this many frames just to avoid sending frames forever if someone leaves page up
        frameInterval: 500,		// Milliseconds to sleep between sending frames to reduce server load and reduce results updates
        frameTimer: -1,		// frame clock for processing
        maxSrcVideoWidth: 512,	// maximum image width for processing
        serverIsLocal: true,    // server is local versus 'firewall' version
        imageIsWaiting: false,  // blocking to prevent too many queued frames
        colorSet: [ "#FF0000", "#FFFF00", "#00FF00", "#00FFFF", "#0000FF", "#FF00FF", 
                    "#FFBFBF", "#FFFFBF", "#BFFFBF", "#BFFFFF", "#BFBFFF", "#FFBFFF"],  // colors for rect and highlight

        // functional customizations for each demo
        documentTitle: "Protobuf Demo",
        mediaList: [],        //relative URLs of media files
        protoList: [],        //relative URLs of proto files to include
        domHeaders: { "Content-type": "text/plain;charset=UTF-8" },   //defaults for headers
        // TODO: should be binary ideally, domHeaders: { "Content-type": "application/octet-stream;charset=UTF-8" },   //defaults for headers

        // Objects from DOM elements
        video: document.getElementById('srcVideo'),
        srcImgCanvas: document.getElementById('srcImgCanvas'),	// we have a 'src' source image
        srcImgCanvasBack: null,  // our back-frame to switch canvas
        srcImgCanvasActive: 0,
    }));

    var hd = $(document.body).data('hdparams');
    if (hd.video) {
        hd.video.addEventListener("loadedmetadata", newVideo);
    }
    //create clone of canvas for better show of data
    if (hd.srcImgCanvas) {
        var domCanvas = $(hd.srcImgCanvas);
        var idCopy = domCanvas.attr('id')+'_clone';
        domCanvas.clone().attr('id', idCopy).appendTo(domCanvas.parent());
        hd.srcImgCanvasBack = document.getElementById(idCopy);
        $(hd.srcImgCanvasBack).hide();        
    }


    $("#protoSource").prop("disabled",true).click(downloadBlobProto);
    $("#protoInput").prop("disabled",true).click(downloadBlobIn);
    $("#protoOutput").prop("disabled",true).click(downloadBlobOut);
    $("#resultText").hide();
    $("#protoBinary").change(doPostBinaryFile);


    //add text input tweak
    $("#serverUrl").change(function() {
        $(document.body).data('hdparams')['classificationServer'] = $(this).val();
        updateLink("serverLink");
    }).val($(document.body).data('hdparams')['classificationServer'])
    //set launch link at first
    $("#protoMethod").change(function() {
        updateProto($(this).attr('id'));
    });

    //if protobuf is enabled, fire load event for it as well
    hd.protoObj = {};  //clear from last load
    $.each(hd.protoList, function(idx, protoTuple) {     //load relevant protobuf tuples
        protobuf_load.apply(this, protoTuple);      //load each file independently
        $("#protoSource").prop("disabled",false);
    });

    // add div to change video or image source
    $.each(hd.mediaList, function(key) {
        //var button = $('<button/>').text(videos[key].name).attr('movie', videos[key].url);
        var div_area = $('<div/>');
        var img_dom = $("<img src='"+hd.mediaList[key].img+"' />");
        if (hd.mediaList[key].movie) {
            img_dom.attr("movie", hd.mediaList[key].movie);
        }
        div_area.append(img_dom);
        div_area.append($("<span />").append($("<a href='"+hd.mediaList[key].source+"' target='_new' />").text(hd.mediaList[key].name)));
        $("#sourceRibbon").append(div_area);
    });
    
    //add the file upload capability
    var div_area = $('<div/>');
    div_area.append($("<label />").text("Upload Image").append("<br />"));
    div_area.append($("<input id='imageLoader' name='imageLoader' type='file' />"));
    $("#sourceRibbon").append(div_area);
    $("#imageLoader").change(function(e) {
        clearInterval(hd.frameTimer);	// stop the processing
        hd.video.pause();
        $(hd.video).hide();
        // $(hd.srcImgCanvas).show();
        var reader = new FileReader();
        reader.onload = function(event){
            switchImage(event.target.result);
        }
        reader.readAsDataURL(e.target.files[0]);
    });

    // add buttons to change video or image
	$("#sourceRibbon").children("div").click(function() {
        var $this = $(this);
        $this.siblings().removeClass('selected'); //clear other selection
        $this.addClass('selected');

        var movieAttr = $this.attr('movie');
        var objImg = $this.children('img')[0];
        if (objImg) {
            movieAttr = $(objImg).attr('movie');
            objImg = $(objImg);
        }

        clearInterval(hd.frameTimer);	// stop the processing
        hd.video.pause();

        if (movieAttr) {
            switchVideo(movieAttr);
        }
        else {
            $(hd.video).hide();
            // $(hd.srcImgCanvas).show();
            if (objImg) 
                switchImage(objImg.attr('src'));
        }
	}).first().click();
}

// trick for two-canvas fetch (essentially using a frame buffer https://en.wikipedia.org/wiki/Framebuffer#Page_flipping)
function canvas_get(getActive=true) {
    var hd = $(document.body).data('hdparams');
    if (getActive)
        return (hd.srcImgCanvasActive == 0) ? hd.srcImgCanvas : hd.srcImgCanvasBack;
    return (hd.srcImgCanvasActive != 0) ? hd.srcImgCanvas : hd.srcImgCanvasBack;
}

// flip display of the two canvases 
function canvas_flip() {
    var hd = $(document.body).data('hdparams');
    var canvasHide = canvas_get(true);
    var canvasShow = canvas_get(false);
    hd.srcImgCanvasActive = (hd.srcImgCanvasActive+1) % 2;
    $(canvasHide).hide();
    $(canvasShow).show();
    return canvasShow;
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
                var typeSummary = {'root':root, 'methods':{}, 'path':pathProto };
                var fileBase = pathProto.split(/[\\\/]/);       // added 7/11/18 for proto context
                fileBase = fileBase[fileBase.length - 1];
                var domGroup = $("<optgroup label='"+fileBase+" - "+namePackage+"' >");
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
                    domGroup.append(domOpt);
                    numMethods++;
                });
                domSelect.append(domGroup);
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
    $("#serverUrl").val(newServer);
    //window.history.pushState({}, $(document.body).data('hdparams')['documentTitle'], sNewUrl);
}

// update proto link
function updateProto(domProtoCombo) {
    var nameProtoMethod = $("#"+domProtoCombo+" option:selected").attr('value');
    $(document.body).data('hdparams').protoKeys = null;
    if (nameProtoMethod && nameProtoMethod.length) {     //valid protobuf type?
        var partsURL = $(document.body).data('hdparams').classificationServer.split("/");
        var protoKeys = nameProtoMethod.split(".", 2);       //modified for multiple detect/pixelate models
        $(document.body).data('hdparams').protoKeys = protoKeys;
        partsURL[partsURL.length-1] = protoKeys[1];
        $(document.body).data('hdparams').classificationServer = partsURL.join("/");   //rejoin with new endpoint
        updateLink("serverLink", $(document.body).data('hdparams').classificationServer);
    }
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
function switchVideo(movieAttr) {
	var hd = $(document.body).data('hdparams');

    // Set the video source based on URL specified in the 'videos' list, or select camera input
    $(hd.video).show();
    // $(hd.srcImgCanvas).hide();
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
        hd.video.autoplay = true;
        newVideo();
    }
}

/**
 * Called after a new video has loaded (at least the video metadata has loaded)
 */
function newVideo() {
	var hd = $(document.body).data('hdparams');
	hd.frameCounter = 0;
	hd.imageIsWaiting = false;

	// set processing canvas size based on source video
	var pwidth = hd.video.videoWidth;
	var pheight = hd.video.videoHeight;
	if (pwidth > hd.maxSrcVideoWidth) {
		pwidth = hd.maxSrcVideoWidth;
		pheight = Math.floor((pwidth / hd.video.videoWidth) * pheight);	// preserve aspect ratio
    }
    var canvasAct = canvas_get();
	canvasAct.width = pwidth;
	canvasAct.height = pheight;

    updateProto("protoMethod");
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
    var canvas = canvas_get(false);
    if (!isVideo) {
        var img = new Image();
        img.crossOrigin = "Anonymous";
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
            updateProto("protoMethod");
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

    hd.imageIsWaiting = true;
    var domHeaders = {};

    //console.log("[doPostImage]: Selected method ... '"+typeInput+"'");
    if (hd.protoKeys) {     //valid protobuf type?
        var blob = dataURItoBlob(dataURL, true);
        domHeaders = $.extend({}, hd.domHeaders);       //rewrite with defaults

        // fields from .proto file at time of writing...
        // message Image {
        //   string mime_type = 1;
        //   bytes image_binary = 2;
        // }

        //TODO: should we always assume this is input? answer: for now, YES, always image input!
        var inputPayload = { "mimeType": blob.type, "imageBinary": blob.bytes };

        // ---- method for processing from a type ----
        var msgInput = hd.protoObj[hd.protoKeys[0]]['root'].lookupType(hd.protoObj[hd.protoKeys[0]]['methods'][hd.protoKeys[1]]['typeIn']);
        // Verify the payload if necessary (i.e. when possibly incomplete or invalid)
        var errMsg = msgInput.verify(inputPayload);
        if (errMsg) {
            var strErr = "[doPostImage]: Error during type verify for object input into protobuf method. ("+errMsg+")";
            $(dstDiv).empty().html(strErr);
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
        // got the input name, from the type, use it here
        hd.protoInputName = hd.protoObj[hd.protoKeys[0]]['methods'][hd.protoKeys[1]]['typeIn'];
        hd.protoOutputName = hd.protoObj[hd.protoKeys[0]]['methods'][hd.protoKeys[1]]['typeOut'];

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
    doPostPayload(sendPayload, domHeaders, dstDiv, dstImg, imgPlaceholder);
}


function doPostBinaryFile(e)  {
    // https://stackoverflow.com/a/10811427
    // https://stackoverflow.com/a/17512132
    var fileReader = new FileReader();
    fileReader.onload = function(e) {
        console.log("[doPostBinaryFile]: Sending uploaded binary file of length "+e.target.result.byteLength);
        doPostBlob(e.target.result);
    };
    var fileLocal = $(this)[0].files[0];
    fileReader.readAsArrayBuffer(fileLocal);

    //usage: $("#ingredient_file").change(doPostBinaryFile);
}

function doPostBlob(blobData)
{
    doPostPayload(blobData, null, '#resultsDiv', '#destImg', null);
}


function doPostPayload(sendPayload, domHeaders, dstDiv, dstImg, imgPlaceholder)
{
    var hd = $(document.body).data('hdparams');
    hd.imageIsWaiting = true;

    dstDiv = $(dstDiv);
    $("#postSpinner").remove();     //erase previously existing one
    dstDiv.append($("<div id='postSpinner' class='spinner'>&nbsp;</div>"));
    if (dstImg)     //convert to jquery dom object
        dstImg = $(dstImg);
    if (!domHeaders)    //pull existing headers from config
        domHeaders = $(document.body).data('hdparams').domHeaders;

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
            if (textStatus=="error") {
                textStatus += " (Was the transform URL valid? Was the right method selected?) ";
            }
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
            canvas_flip();
            var returnState = processResult(data, dstDiv, hd.protoKeys, dstImg, imgPlaceholder);
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
    var hd = $(document.body).data('hdparams');
    return downloadBlob(hd.protoPayloadOutput, "protobuf."+hd.protoOutputName+".bin");
}

function downloadBlobIn() {
    var hd = $(document.body).data('hdparams');
    return downloadBlob(hd.protoPayloadInput, "protobuf."+hd.protoInputName+".bin");
}

function downloadBlobProto() {
    var namePackage = $(document.body).data('hdparams').protoKeys[0];
    var pathProto = $(document.body).data('hdparams').protoObj[namePackage]['path'];
    protobuf.util.fetch(pathProto, {binary:true}, function(statusStr, data) {
        var fileBase = pathProto.split(/[\\\/]/);       // added 7/11/18 for proto context
        fileBase = fileBase[fileBase.length - 1];
        return downloadBlob(data, fileBase, "text/plain");
    });
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


// draw a region in the source canvas 
function canvas_rect(clear_first, r_left, r_top, r_width, r_height, r_color) {
    if (!r_color) r_color = "blue";

    var line_width = 4;
    var src_canvas = canvas_get();
    
    var hd = $(document.body).data('hdparams');
    var ctx = src_canvas.getContext('2d');
    if (clear_first) {
        ctx.clearRect(0, 0, src_canvas.width, src_canvas.height);
    }

    //key to starting different colors
    ctx.beginPath();
    ctx.lineWidth=line_width;
    var offsWidth = Math.floor(line_width/2);
    ctx.strokeStyle=r_color;
    ctx.moveTo(r_left+offsWidth, r_top+offsWidth);
    ctx.lineTo(r_left+offsWidth+r_width, r_top+offsWidth);
    ctx.lineTo(r_left+offsWidth+r_width, r_top+offsWidth+r_height);
    ctx.lineTo(r_left+offsWidth, r_top+offsWidth+r_height);
    ctx.lineTo(r_left+offsWidth, r_top+offsWidth);
    ctx.stroke();
    //ctx.strokeRect(r_left+line_width, r_top+line_width, r_width, r_height);
    //console.log("[canvas_rect]: "+r_left+","+r_top+"x"+r_width+","+r_height+", color:"+r_color);
}


