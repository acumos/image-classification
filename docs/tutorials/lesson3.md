# Web Demo
To extend functionality into a usable web-demo, a second set of assets were
created as a [demo web page](../../web_demo).

This web page sample uses an HTML5 player to play an mp4 video and submit its
frames to an image classification service.

** Video Copyrights May Apply ** - the included sample videos may carry
additional copyrights and are not meant for public resale or consumption.

## Browser Interaction
Most browsers should have no
CORS or other cross-domain objections to dropping the file `image-classes.html`
into the browser and accesing a locally hosted server API, as configured
in [the previous tutorial](lesson2.md).


## Example classification demo
To customize this demo, one should change either the included javascript
or simply update the primary classification URL on the page itself during runtime.

* confirm that your local instance is configured and running
* download this directory to your local machine
  * confirm the host port and classification service URL in the file `image-classes.js`
```
classificationServer: "http://localhost:8885/classify",
```
* view the page `image-classes.html` in a Crome or Firefox browser (sorry other browsers may not properly serve the HTML5 video tag)
* probabilities will be updated on the right side fo the screen
* you can switch between a few sample videos by clicking on the buttons below the main video player
* ![example web application classifying tigers video](example_running.jpg "Example web application classifying tigers video")