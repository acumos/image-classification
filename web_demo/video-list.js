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
video-list.js - list of videos to select for processing
David Gibbon 1/10/14, 8/1/17
Eric Zavesky 3/23/18 video switch-up, add attribution
Eric Zavesky 7/27/18 slight schema change, add image sample as first

Format is video URL, name to show up in UI, and (optional) frame rate (frames per second, default 15)
Note that cross origin may prohibit external URLs
*/
var videos = [
	//{
	//  'url': 'webrtc', // this is a special code to use the local camera rather than a URL. This fails due to 11/2016 web security policy unless command line arguments are used.
	//  'name': 'Camera'
	//},
	{
        'img': 'video/stock-footage-bicycles.jpg',
        'source': 'https://videos.pexels.com/videos/mountain-bikers-during-daytime-857083',
        'name': 'bikes (image)'
    },
    {
        'movie': 'video/stock-footage-city-cars.mp4',
        'img': 'video/stock-footage-city-cars.jpg',
        'source': 'https://videos.pexels.com/videos/cars-on-the-road-854745',
        'name': 'city-cars'
	},
	{
        'movie': 'video/stock-footage-bicycles.mp4',
        'img': 'video/stock-footage-bicycles.jpg',
        'source': 'https://videos.pexels.com/videos/mountain-bikers-during-daytime-857083',
        'name': 'bikes'
	},
	{
        'movie': 'video/stock-footage-coast-time.mp4',
        'img': 'video/stock-footage-coast-time.jpg',
        'source': 'https://videos.pexels.com/videos/sunset-by-the-sea-857056',
        'name': 'costal-lapse'
	},
	// {
    //     'img': 'video/stock-footage-squirrel.jpg',
    //     'movie': 'video/stock-footage-squirrel.mp4',
    //     'source': 'https://videos.pexels.com/videos/squirrel-eating-855213',
    //     'name': 'squirrel'
	// },
	{
        'img': 'video/stock-footage-dogs.jpg',
        'movie': 'video/stock-footage-dogs.mp4',
        'source': 'https://videos.pexels.com/videos/dogs-playing-853846',
        'name': 'park-dogs'
	},
	{
        'movie': 'video/stock-footage-scuba.mp4',
        'img': 'video/stock-footage-scuba.jpg',
        'source': 'https://videos.pexels.com/videos/paddle-surfing-and-scuba-diving-video-854387',
        'name': 'scuba'
	},
];
