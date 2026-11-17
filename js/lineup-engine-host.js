(function(){
  'use strict';
  var editor=new URLSearchParams(location.search).get('mode')==='editor';
  document.documentElement.dataset.mode=editor?'editor':'public';
  var css=document.createElement('link');css.rel='stylesheet';css.href='css/lineup-engine-'+(editor?'editor':'public')+'.css?v=20261117-lineup-yearly-6';document.head.appendChild(css);
  var script=document.createElement('script');script.src='js/lineup-engine-'+(editor?'editor':'bridge')+'.js?v=20261117-lineup-yearly-6';document.body.appendChild(script);
})();
