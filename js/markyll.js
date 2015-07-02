/**
 * This script converts the rendered HTML by the jekyll converter to separate
 * slides and saves them each into <section> tags.
 * It also parses the configuration flags.
 */

//!(function(document, Reveal){
//====================
// Done:
// - Notes
// - Remove config text from object
// - Fragment list items, globally or slide specific
// - Animate slides
// - IFrame / Video URL as background
// - Subsections based on H2+ headers
// - Ignore config options in code nodes
// - Disable animations on first nodes
// - Parameters as content with underscores http://_big_joke_.com/
// - Ignore config options in code nodes
//
// TODO:
// Next Release:
// - Apple Touch icon
// - Align config
// - Logo config
// - Auto add layout the slides according to their content. Css only? ^^
// - Auto resize text size if it's overflowing
// - Sets of background images
// - Notes working without socketio
// - Easy include icons (fontawesome)
// - Fragment specific items
//

var $slide = null;
var isNoting = false;
var $bulk = document.createDocumentFragment();
var $content = document.getElementById('content');
var $slides = document.getElementById('slides');
var elementOptions = [
    'id',
    'background',
    'background-image',
    'background-iframe',
    'background-video',
    'background-size',
    'background-repeat',
    'transition',
    'transition-speed'
  ];
var i;
var length;
var line;
var split;
var $node;
var $notes;
var subsliding;

// Animate is by defiault the globally set animation parameter
// Once a slide adds it as a config flag, it will overwrite the default
// setting and add it to each node within that slide After the config was set
// After creating each new slide, it will be reset to the default animation flag
var animate = false;

// The slides are stored in documentFragments, pushed to the slides array.
var slides = [];

// Store jekyll's generated HTML as an alias to $nodes
// We will organise them into separate slides based on the HTML tags and
// their contents. Read more on that here: //TODO
var $nodes = $content.children;

while (($node = $nodes[0]) && $node !== undefined) {

  // Create a new slide once running into one of the following tags
  // And push it to the `slides` array
  if ($slide === null || ($node.nodeType === 1 && (
      $node.tagName === 'HR' ||
      $node.tagName === 'SECTION' ||
      $node.tagName === 'H1'))) {

    // Stop taking notes for the previous slide
    isNoting = false;

    // Create a new slide Three
    subsliding = false;

    // If we're dealing with a section tag, it's probably created for the
    // reveal.js API. We are skipping all our handling and just add the slide
    // to the deck
    if ($node.tagName === 'SECTION') {
      slides.push($node);

      //continue;
    }

    // Set the default animation settings for the nodes inside the slide
    // Text configuration inside the slide can overwrite the animation
    // settings for the current slide
    animate = jekyllFlags.animate;

    // Generate the slide, keep it's reference and add it to slides array
    slides.push($slide = document.createElement('section'));
  }

  // Don't add HR tags to the slides
  if ($node.tagName === 'HR') {
    // Remove the child so we don't iterate it again in our while loop
    $content.removeChild($node);
    continue;
  }

  // An H2 tag will convert the current slide into a slide with vertical slides
  // If the current slide was already converted we won't do so
  // It converts it by creating a new overlapping section element. Call it sectionA
  // The current slide (sectionB) will be appended to that section
  // Then we create a new section, append that to sectionA as well
  //  Visually:
  //  Before:
  //    <section id="B">
  //      H1 Blah content
  //    </section>
  //  After:
  //    <section id="A">
  //      <section id="B">
  //        H1 Blah content
  //      </section>
  //      <section id="C">
  //      </section>
  //    </section>
  //    ---
  //  Whereas $slide references to B in the beginning, but will later be overwritten by C
  //  If we bump into another H2, we'll create another section, and add that to A
  if ($node.tagName === 'H2') {
    // Create A, move B to A, and overwrite $slide by C
    if (subsliding === false) {
      subsliding = true;
      var A = document.createElement('section');

      // Add B to A
      A.appendChild($slide);

      // Overwrite the slide in the slides array with the new slide
      slides[slides.length - 1] = A;
    }

    // Create a new section for C
    var C = document.createElement('section');
    $slide.parentNode.appendChild(C);
    $slide = C;
  }

  // Read config options in the node
  // Don't do this for <code> elements
  if ($node.tagName !== 'CODE') {
    var textLines = $node.innerHTML.split('\n');
    for (i = 0; i < textLines.length; i++) {
      line = textLines[i];
      split = line.split(':');
      configKey = split[0];
      configValue = line.substring(line.indexOf(':') + 1);

      // Parse the text to the notes section if it starts with notes:
      if (i === 0 && configKey === 'notes') {
        isNoting = true;
        $notes = document.createElement('aside');
        $notes.className = 'notes';

        // Add the just created 'notes' element to the slide
        $slide.appendChild($notes);

        // Remove the 'Notes: ' part from the content
        $node.innerHTML = $node.innerHTML.replace(/^notes?\:\s?/i, '');
        continue;
      }

      // The animate config option will set a variable and will in a later
      // process set the animation to the slide.
      // We do this so we can set a global animation option
      if (configKey === 'animate') {
        animate = configValue;

        // Remove the config line from the HTML
        $node.innerHTML = $node.innerHTML.replace(line, '');
      }

      // Only add the option if its in a whitelisted array of element options
      if (~elementOptions.indexOf(configKey)) {
        var match;
        console.log(configKey)

        // Youtube background options
        // If property is background-video and its a youtube link, grab the
        // video id, and display its thumbnail as a background image.
        // Later in our code, we will replace the created background divs with
        // youtube players trough youtube player's api.
        // I previously included the videos trough an embed code. This didn't
        // allow me to mute the sound.
        // Muting the sound is important when displaying the videos in an
        // overview page.
        if (configKey === 'background-video'
            && (match = configValue.match(/https?\:\/\/www\.youtube\.com\/watch\?v=([A-Za-z0-9\_\-]+)/i)).length > 0) {
          configKey = 'background';
          configValue = 'https://img.youtube.com/vi/' + match[1] + '/maxresdefault.jpg';
        }

        // Set the (background-)attribute to the slide's tag to communicate with reveal.js's
        // api
        $slide.setAttribute(

          // Allow the ID to be set to the slide, without the 'data-' prefix
          configKey === 'id'
            ? configKey
            : 'data-' + configKey,
          configValue);

        // Remove the config line from the HTML
        $node.innerHTML = $node.innerHTML.replace(line, '');
      }
    }

    // See if the node matches any icon texts
    // Icons can be defined like this: [heartbeat]
    // Flags can be set as [cog spin pulse flip-horizontal]
    var icons = $node.innerHTML.match(/\[[\w\-\ ]+\]/g);
    if (icons) {
      var newHTML = $node.innerHTML;

      // Loop trough the icons to replace them with the font-awesome HTML
      // equivalent
      for (var i = 0; i < icons.length; i++) {
        var iconText =  icons[i];
        var iconParam = iconText.substring(1, iconText.length - 1).split(' ');
        var iconFlags = 'fa-' + iconParam.join(' fa-');

        // Replace the icon text in the cached HTML
        newHTML = newHTML.replace(iconText, '<i class="fa ' + iconFlags  + '"></i>');
      }

      // Set the new HTML
      $node.innerHTML = newHTML;
    }
  }

  // Skip and delete the node if its empty
  // Handling empty notes (generated by the Markdown parser) can become annoying when animating
  if (~$node.innerHTML.search(/^\s+$|^$/)) {
    $content.removeChild($node);
    continue;
  }

  // If we're taking notes, add our current node's content to the notes box
  if (isNoting) {
    $notes.appendChild($node);

    // Continue, so the just added note content doesn't move to $slide
    continue;
  }

  // Set the animation settings to the node if they exist
  if (animate !== false && animate !== 'false' && animate !== '') {
    // When animating a list, animate it's children instead
    // Otherwise the UL node will be animated, and everything will appear all at once
    if ($node.tagName === 'UL' || $node.tagName === 'OL') {
      length = $node.children.length;
      for (var ci = 0; ci < length; ci++) {
        animateNode($node.children[ci], animate);
      }
    }

    // Set the animation.
    // But not on the first node. By checking how many nodes there are in the
    // slide, we can see if we still have to append the first one or not
    else if ($slide.children.length > 0) {
      animateNode($node, animate);
    }
  }

  $slide.appendChild($node);
}

// Add the generated slides to the DOM
// We add all the generated slides to one documentFragment ($bulk)
for (i = 0; i < slides.length; i++) {
  $bulk.appendChild(slides[i]);
}

// .. and append the bulk to the dom
$slides.appendChild($bulk);

// Generate the Reveal Settings Object
var revealSettings = {

  // Leap motion settings
  leap: {
    naturalSwipe: false,    // Invert swipe gestures
    pointerOpacity: 0.5,      // Set pointer opacity to 0.5
    //pointerColor: '#d80000' // Red pointer
    pointerColor: '#ffffff' // Red pointer
  },

  // Optional libraries used to extend on reveal.js
  dependencies: [

    // TODO this code seems unecessary, as GH is already parsing our Md
    //{
      //src: '/reveal.js/plugin/markdown/marked.js',
      //condition: function() {
        //return !!document.querySelector('[data-markdown]');
      //}
    //},

    ////
    //{
      //src: '/reveal.js/plugin/markdown/markdown.js',
      //condition: function() {
        //return !!document.querySelector('[data-markdown]');
      //}
    //},

    // Speaker notes
    {
      src: '/reveal.js/plugin/notes/notes.js',
      async: true
    },

    // Leap motion
    {
      src: '/reveal.js/plugin/leap/leap.js',
      async: true
    },

    // Code highlighting
    {
      src: '/reveal.js/plugin/highlight/highlight.js',
      async: true,
      callback: function() {
        window.hljs.initHighlightingOnLoad();
      }
    },

    // HTML5 classlist fallback
    {
      src: '/reveal.js/lib/js/classList.js',
      condition: function() {
        return !document.body.classList;
      }
    }
  ]
};

var k;
for (k in jekyllFlags) {
  revealSettings[k] = jekyllFlags[k];
}

// Initialize Reveal
Reveal.initialize(revealSettings);

// Define jekyllFlags if it doesn't exist yet
if (typeof jekyllFlags === 'undefined') {
  jekyllFlags = {};
}

// If the blur flag was set to 'yes' or 'true', set it to 20 (default value)
if (typeof jekyllFlags.blur === 'string' && jekyllFlags.blur.match(/yes|true/)) {
  jekyllFlags.blur = 20;
}

// Blur the background image if the blur flag was set
if (parseInt(jekyllFlags.blur, 10) > 0) {
  var style = document.getElementsByClassName('backgrounds')[0].style;

  // Stretch the background image to compensate the incoming white blur
  style.top = style.right = style.bottom = style.left = '-' + jekyllFlags.blur + 'px';

  // Make the width and height 'auto' so it can stretch to the new
  // top-left-right-bottom dimensions
  style.width = style.height = 'auto';

  // Set the blur with the css filter property
  style.filter =
    style.webkitFilter =
    style.mozFilter =
    style.oFilter =
    style.msFilter = 'blur(' + jekyllFlags.blur + 'px)';

}

console.log('im alive');

// Convert the youtube background images to youtube video players
// 1. Get all the background image nodes and filter the ones which are youtube
// thumbnails
// 2. Assing an id to the div and call the YouTube API to embed a video in there
// 3. On the video's onLoad event (triggered by the API), we mute the video, disable controls and autoplay in a loop
//    This action is triggered by the `tweakPlayer` function
function onYouTubeIframeAPIReady() {
  var backgroundNodes = document.getElementsByClassName('backgrounds')[0].childNodes;
  var backgroundNode;
  var backgroundImage;
  var youtubeMatch;
  var nodeId;
  for (var i = 0, length = backgroundNodes.length; i < length; i++) {
    backgroundNode = backgroundNodes[i];
    console.log(backgroundNode);

    backgroundImageUrl = backgroundNode.getAttribute('data-background-hash');
    youtubeMatch = backgroundImageUrl && backgroundImageUrl.match(
      /\/\/img\.youtube\.com\/vi\/([0-9a-zA-Z\-\_]+)\/maxresdefault.jpg/
      );

    if (youtubeMatch) {
      // assing an ID to the background div so youtube's api can handle it
      backgroundNode.id = nodeId = 'youtubeBackground' + i;

      player = new YT.Player(nodeId, {
        videoId: youtubeMatch[1],
        loop: 1,

        playerVars: {
          controls: 0,
          disablekb: 0,
          modestbranding: 1,
          showinfo: 0,
          loop: 1,
          enablejsapi: 1,
          origin: window.location.origin,

          // Youtube's loop flag won't work unless its a 'playlist'
          // whereas a 'playlist' can also be a videoID
          playlist: youtubeMatch[1]
        },

        events: {
          onReady: tweakPlayer
        }
      });
    }
  }
}

// This function is triggered after the youtube embedder finished loading
function tweakPlayer(event) {
  console.log('youtube player finished loading', event);

  // mute the sound
  event.target.mute();

  // play the video
  event.target.playVideo();
}

// Function definitions
// Returns the amount of html tags, given the input tagname
function countTags(tag) { return content.getElementsByTagName(tag).length; }

// Will add the CSS classes to the nodes we need to animate
// Reveal.js will animate any node in the slide with the class 'fragment' and
// an animation class, such as 'grow'.
function animateNode($node, animation) {
  $node.classList.add('fragment');

  // Add the specified animation name
  // The Classlist function doesn't like whitespaces
  $node.classList.add(animation.replace(/\s+/g, ''));
}

//====================
//})(document, Reveal);
