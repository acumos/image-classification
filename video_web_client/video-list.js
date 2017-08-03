/**
video-list.js - list of videos to select for processing
David Gibbon 1/10/14, 8/1/17

Format is video URL, name to show up in UI, and (optional) frame rate (frames per second, default 15)
Note that cross origin may prohibit external URLs
*/
var videos = [
	//{
	//  'url': 'webrtc', // this is a special code to use the local camera rather than a URL. This fails due to 11/2016 web security policy unless command line arguments are used.
	//  'name': 'Camera'
	//},
	{
	  'url': 'video/stock-footage-a-radio-telescope-dish-in-the-very-large-array-reconfigures-to-point-straight-up.mp4', 
	  'name': 'uplink'
	},
	{
	  'url': 'video/stock-footage-sailboat-with-snorkelers.mp4', 
	  'name': 'catamaran'
	},
	{
	  'url': 'video/stock-footage-couple-at-beach-with-tandem-bicycle.mp4', 
	  'name': 'tandem'
	},
	{
	  'url': 'video/stock-footage-canada-circa-transport-trucks-on-highway.mp4', 
	  'name': 'trucks'
	},
	{
	  'url': 'video/stock-footage-tigers-fight-game-play-tigers-are-fighting-in-a-wild-biting-its-body-and-neck-fight-for-dominate.mp4', 
	  'name': 'tigers'
	},
	{
	  'url': 'video/stock-footage-red-squirrel-at-the-chestnut-close-portrait.mp4', 
	  'name': 'squirrel'
	},
	{
	  'url': 'video/stock-footage-yawning-gray-fox.mp4', 
	  'name': 'gray fox'
	},
	{
	  'url': 'video/stock-footage-beagle-in-an-autumn-park.mp4', 
	  'name': 'dog'
	}
];

