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
 D. Gibbon 8/1/17 adapted for system
 E. Zavesky 05/05/18 adapted for row-based image and other results
 E. Zavesky 05/30/18 forked model generic code to `demo-framework.js`, switch to flat image
 */

"use strict";

/**
 * main entry point
 */

// called one time when document is ready
$(document).ready(function() {
    var urlDefault = getUrlParameter('url-image');
    if (!urlDefault)
        urlDefault = "http://localhost:8886/classify";
    demo_init({
        classificationServer: urlDefault,
        mediaList: videos,
        protoList: [["model.proto", true]]
    });
});

// what do we do with a good processing result?
//
//  data: the raw body from the response
//  dstImg: the dom element of a destination image
//  methodKeys: which protomethod was selected
//  dstImg: the dom element of a destination image (if available)
//  imgPlaceholder: the exported canvas image from last source
//
function processResult(data, dstDiv, methodKeys, dstImg, imgPlaceholder) {
    var hd = $(document.body).data('hdparams');
    if (methodKeys!=null) {     //valid protobuf type?
        var bodyEncodedInString = new Uint8Array(data);
        $("#protoOutput").prop("disabled",false);
        hd.protoPayloadOutput = bodyEncodedInString;
        //console.log(typeof(data));
        //console.log(typeof(bodyEncodedInString));
        //console.log(bodyEncodedInString);

        // ---- method for processing from a type ----
        var msgOutput = hd.protoObj[methodKeys[0]]['root'].lookupType(hd.protoObj[methodKeys[0]]['methods'][methodKeys[1]]['typeOut']);
        var objOutput = null;
        try {
            objOutput = msgOutput.decode(hd.protoPayloadOutput);
        }
        catch(err) {
            var errStr = "Error: Failed to parse protobuf response, was the right method chosen? (err: "+err.message+")";
            console.log(errStr);
            dstDiv.html(errStr);
            return false;
        }

        //console.log(msgOutput);
        console.log(objOutput);     //log parsed objects to console

        //try to crawl the fields in the protobuf....
        var numFields = 0;
        var nameRepeated;
        $.each(msgOutput.fields, function(name, val) {           //collect field names
            if (val.repeated) {     //indicates it's a repeated field (likely an array)
                nameRepeated = name;      //save this as last repeated field (ideally there is just one)
            }
            numFields += 1;
        });
        if (numFields > 1) {
            var errStr = "Error: Expected array/repeated structure in response, but got non-flat array result ("+numFields+" fields)";
            console.log(errStr);
            dstDiv.html(errStr);
            return false;
        }
        var objRecv = objOutput[nameRepeated];

        //grab the nested array type and print out the fields of interest
        //var typeNested = methodKeys[0]+"."+msgOutput.fields[nameRepeated].type;
        //var msgOutputNested = hd.protoObj[methodKeys[0]]['root'].lookupType(typeNested);
        genClassTable(objRecv, dstDiv);
    }
    else {
        var objRecv = $.parseJSON(request.responseText);
        genClassTable(objRecv, dstDiv);
    }
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




