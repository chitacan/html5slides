/*
  Google HTML5 slides template

  Authors: Luke Mahé (code)
           Marcin Wichary (code and design)

           Dominic Mazzoni (browser compatibility)
           Charles Chen (ChromeVox support)

  URL: http://code.google.com/p/html5slides/
*/

// svn에서 몇몇 소스를 가져오기 위해 사용되는 상수. 나에겐 필요없음
var PERMANENT_URL_PREFIX = 'http://html5slides.googlecode.com/svn/trunk/';

// slide 클래스의 종류를 `far-past`, `past`, `current`, `next`, `far-next`로 나눔
var SLIDE_CLASSES = ['far-past', 'past', 'current', 'next', 'far-next'];

// 터치 계산시 사용됨
var PM_TOUCH_SENSITIVITY = 15;

// 현재 슬라이드의 인덱스를 나타냄
var curSlide;

/* ---------------------------------------------------------------------- */
/* classList polyfill by Eli Grey 
 * (http://purl.eligrey.com/github/classList.js/blob/master/classList.js) */


// 아래 두 조건이 참이면 진행 (크롬에선 타지 않으며, IE를 위한 코드임 ㄷ)
// 
// * `docuemnt` 가 선언되어 있지 **않고**,
// * `<a></a>`를 하나 만들고 거기에 `classList` 가 선언되어 있지 **않은지** 확인
//  * 크롬 콘솔에서 `console.dir(document.createElement("a"))` 확인해 보면 `classList` 를 확인할 수 있다.
if (typeof document !== "undefined" && !("classList" in document.createElement("a"))) {

(function (view) {

var
    classListProp = "classList"
  , protoProp = "prototype"
  , elemCtrProto = (view.HTMLElement || view.Element)[protoProp]
  , objCtr = Object
    strTrim = String[protoProp].trim || function () {
    return this.replace(/^\s+|\s+$/g, "");
  }
  , arrIndexOf = Array[protoProp].indexOf || function (item) {
    for (var i = 0, len = this.length; i < len; i++) {
      if (i in this && this[i] === item) {
        return i;
      }
    }
    return -1;
  }
  /* Vendors: please allow content code to instantiate DOMExceptions */
  , DOMEx = function (type, message) {
    this.name = type;
    this.code = DOMException[type];
    this.message = message;
  }
  , checkTokenAndGetIndex = function (classList, token) {
    if (token === "") {
      throw new DOMEx(
          "SYNTAX_ERR"
        , "An invalid or illegal string was specified"
      );
    }
    if (/\s/.test(token)) {
      throw new DOMEx(
          "INVALID_CHARACTER_ERR"
        , "String contains an invalid character"
      );
    }
    return arrIndexOf.call(classList, token);
  }
  , ClassList = function (elem) {
    var
        trimmedClasses = strTrim.call(elem.className)
      , classes = trimmedClasses ? trimmedClasses.split(/\s+/) : []
    ;
    for (var i = 0, len = classes.length; i < len; i++) {
      this.push(classes[i]);
    }
    this._updateClassName = function () {
      elem.className = this.toString();
    };
  }
  , classListProto = ClassList[protoProp] = []
  , classListGetter = function () {
    return new ClassList(this);
  }
;
/* Most DOMException implementations don't allow calling DOMException's toString()
 * on non-DOMExceptions. Error's toString() is sufficient here. */
DOMEx[protoProp] = Error[protoProp];
classListProto.item = function (i) {
  return this[i] || null;
};
classListProto.contains = function (token) {
  token += "";
  return checkTokenAndGetIndex(this, token) !== -1;
};
classListProto.add = function (token) {
  token += "";
  if (checkTokenAndGetIndex(this, token) === -1) {
    this.push(token);
    this._updateClassName();
  }
};
classListProto.remove = function (token) {
  token += "";
  var index = checkTokenAndGetIndex(this, token);
  if (index !== -1) {
    this.splice(index, 1);
    this._updateClassName();
  }
};
classListProto.toggle = function (token) {
  token += "";
  if (checkTokenAndGetIndex(this, token) === -1) {
    this.add(token);
  } else {
    this.remove(token);
  }
};
classListProto.toString = function () {
  return this.join(" ");
};

if (objCtr.defineProperty) {
  var classListPropDesc = {
      get: classListGetter
    , enumerable: true
    , configurable: true
  };
  try {
    objCtr.defineProperty(elemCtrProto, classListProp, classListPropDesc);
  } catch (ex) { // IE 8 doesn't support enumerable:true
    if (ex.number === -0x7FF5EC54) {
      classListPropDesc.enumerable = false;
      objCtr.defineProperty(elemCtrProto, classListProp, classListPropDesc);
    }
  }
} else if (objCtr[protoProp].__defineGetter__) {
  elemCtrProto.__defineGetter__(classListProp, classListGetter);
}

}(self));

}

function getSlideEl(no) {
  if ((no < 0) || (no >= slideEls.length)) { 
    return null;
  } else {
    return slideEls[no];
  }
};

// `slideNo`에 해당하는 슬라이드를 가져와, `className`이 있으면, 앨리먼트에 붙인다.
// `className`이 미리정의된 이름이 아닐경우 앨리먼트에서 제거.
// 앨리먼트에 `className`이 적용되는 순간 매치된 css에 의해 애니메이션이 실행된다.
function updateSlideClass(slideNo, className) {
  var el = getSlideEl(slideNo);
  
  if (!el) {
    return;
  }
  
  if (className) {
    el.classList.add(className);
  }
    
  for (var i in SLIDE_CLASSES) {
    if (className != SLIDE_CLASSES[i]) {
      el.classList.remove(SLIDE_CLASSES[i]);
    }
  }
};

// 현재 슬라이드를 가준으로 앨리먼트의 클래스를
// 
// * -2 : `far-past`
// * -1 : `past`
// * 0 (현재 슬라이드) : `current`
// * +1 : `next`
// * +2 : `far-next`
// 
// 로 설정한다.
// (*이 부분 좀 이상함. 앞뒤 슬라이드 앨리먼트 몇개만 업뎃치면 되는디 전부 다 돌면서 업뎃*)
// 
// 이 메소드가 호출되는 시점에 `curSlide`는 이미 다음에 화면에 보여질 슬라이드를 가리키고 있음.
// 
// * 따라서 `curSlide - 1`이 현재 화면에 보여지고 있는 슬라이드.
// * `curSlide - 1` 슬라이드에 대해 `onslideleave` 이벤트 emit.
// * `curSlide` 슬라이드에 대해 `onslideenter` 이벤트 emit.
// * 0.3 초 후에 `curSlide - 2` 슬라이드에 대해 `disableSlideFrames` 메소드 호출.
// * `curSlide - 1`, `curSlide + 2` 슬라이드에 대해 'enableSlideFrames' 메소드 호출.
// * 현재 location 의 해쉬값을 업데이트
function updateSlides() {
  for (var i = 0; i < slideEls.length; i++) {
    switch (i) {
      case curSlide - 2:
        updateSlideClass(i, 'far-past');
        break;
      case curSlide - 1:
        updateSlideClass(i, 'past');
        break;
      case curSlide: 
        updateSlideClass(i, 'current');
        break;
      case curSlide + 1:
        updateSlideClass(i, 'next');      
        break;
      case curSlide + 2:
        updateSlideClass(i, 'far-next');      
        break;
      default:
        updateSlideClass(i);
        break;
    }
  }

  triggerLeaveEvent(curSlide - 1);
  triggerEnterEvent(curSlide);

  window.setTimeout(function() {
    disableSlideFrames(curSlide - 2); // Hide after the slide
  }, 301);

  enableSlideFrames(curSlide - 1);
  enableSlideFrames(curSlide + 2);
  
  if (isChromeVoxActive()) {
    speakAndSyncToNode(slideEls[curSlide]);
  }  

  updateHash();
};

// 현재 슬라이드 앨이멘트에 `.to-build` 가 붙어 있으면 **true**, 없으면 **false**.
// `.to-build` 가 되어 있으면 해당 앨리먼트에 대해 `speakAndSyncToNode` 를 실행
function buildNextItem() {
  var toBuild  = slideEls[curSlide].querySelectorAll('.to-build');

  if (!toBuild.length) {
    return false;
  }

  toBuild[0].classList.remove('to-build', '');

  if (isChromeVoxActive()) {
    speakAndSyncToNode(toBuild[0]);
  }

  return true;
};

// 슬라이드를 앞으로 이동하기 위해서는 이 메소드 호출이 필요함
function prevSlide() {
  if (curSlide > 0) {
    curSlide--;

    updateSlides();
  }
};

// 현재 슬라이드의 인덱스를 나타내는 `curSlide`를 업데이트하고, `updateSlides` 메소드를 호출.
// 슬라이드를 뒤로 이동하기 위해서는 이 메소드 호출이 필요함
function nextSlide() {
  if (buildNextItem()) {
    return;
  }

  if (curSlide < slideEls.length - 1) {
    curSlide++;

    updateSlides();
  }
};

// `onslideenter` event emit
function triggerEnterEvent(no) {
  var el = getSlideEl(no);
  if (!el) {
    return;
  }

  var onEnter = el.getAttribute('onslideenter');
  if (onEnter) {
    new Function(onEnter).call(el);
  }

  var evt = document.createEvent('Event');
  evt.initEvent('slideenter', true, true);
  evt.slideNumber = no + 1; // Make it readable

  el.dispatchEvent(evt);
};

// `onslideleave` event emit
function triggerLeaveEvent(no) {
  var el = getSlideEl(no);
  if (!el) {
    return;
  }

  var onLeave = el.getAttribute('onslideleave');
  if (onLeave) {
    new Function(onLeave).call(el);
  }

  var evt = document.createEvent('Event');
  evt.initEvent('slideleave', true, true);
  evt.slideNumber = no + 1; // Make it readable
  
  el.dispatchEvent(evt);
};

// `touchstart` 이벤트를 핸들링한다.
// 이때 전달되는 `event` 오브젝트의 상세는 
// 
//      http://www.w3.org/TR/touch-events/#idl-def-TouchEvent
// 
// 여기서 확인 가능하다.
// 
// 음, 희안한게 터치 이벤트가 시작되면 `touchmove`, `touchend` 이벤트 리스너를 등록한다.
function handleTouchStart(event) {
  if (event.touches.length == 1) {
    touchDX = 0;
    touchDY = 0;

    touchStartX = event.touches[0].pageX;
    touchStartY = event.touches[0].pageY;

    document.body.addEventListener('touchmove', handleTouchMove, true);
    document.body.addEventListener('touchend', handleTouchEnd, true);
  }
};

function handleTouchMove(event) {
  if (event.touches.length > 1) {
    cancelTouch();
  } else {
    touchDX = event.touches[0].pageX - touchStartX;
    touchDY = event.touches[0].pageY - touchStartY;
  }
};

function handleTouchEnd(event) {
  var dx = Math.abs(touchDX);
  var dy = Math.abs(touchDY);

  if ((dx > PM_TOUCH_SENSITIVITY) && (dy < (dx * 2 / 3))) {
    if (touchDX > 0) {
      prevSlide();
    } else {
      nextSlide();
    }
  }
  
  cancelTouch();
};

// `touchstart` 이벤트 핸들러에서 등록된 `touchmove`,`touchend` 이벤트를 해제한다.
function cancelTouch() {
  document.body.removeEventListener('touchmove', handleTouchMove, true);
  document.body.removeEventListener('touchend', handleTouchEnd, true);  
};

// 현재 슬라이드를 가져와 `iframe`이 있을 경우 disable.
function disableSlideFrames(no) {
  var el = getSlideEl(no);
  if (!el) {
    return;
  }

  var frames = el.getElementsByTagName('iframe');
  for (var i = 0, frame; frame = frames[i]; i++) {
    disableFrame(frame);
  }
};

// 특정 슬라이드를 가져와 `iframe` 이 있으면 `enableFrame` 메소드를 호출한다.
function enableSlideFrames(no) {
  var el = getSlideEl(no);
  if (!el) {
    return;
  }

  var frames = el.getElementsByTagName('iframe');
  for (var i = 0, frame; frame = frames[i]; i++) {
    enableFrame(frame);
  }
};

function disableFrame(frame) {
  frame.src = 'about:blank';
};

// `iframe`에 설정된 소스를 로드한다.
function enableFrame(frame) {
  var src = frame._src;

  if (frame.src != src && src != 'about:blank') {
    frame.src = src;
  }
};

function setupFrames() {
  var frames = document.querySelectorAll('iframe');
  for (var i = 0, frame; frame = frames[i]; i++) {
    frame._src = frame.src;
    disableFrame(frame);
  }
  
  enableSlideFrames(curSlide);
  enableSlideFrames(curSlide + 1);
  enableSlideFrames(curSlide + 2);  
};

// `prev-slide-area`, `next-slide-area`에 클릭이벤트 리스너를 붙인다.
// DOM body에 `touchstart` 이벤트 리스너를 붙인다.
function setupInteraction() {
  
  var el = document.createElement('div');
  el.className = 'slide-area';
  el.id = 'prev-slide-area';  
  el.addEventListener('click', prevSlide, false);
  document.querySelector('section.slides').appendChild(el);

  var el = document.createElement('div');
  el.className = 'slide-area';
  el.id = 'next-slide-area';  
  el.addEventListener('click', nextSlide, false);
  document.querySelector('section.slides').appendChild(el);  
  
  document.body.addEventListener('touchstart', handleTouchStart, false); // add listener for swiping
}

// ### ChromeVox support

function isChromeVoxActive() {
  if (typeof(cvox) == 'undefined') {
    return false;
  } else {
    return true;
  }
};

function speakAndSyncToNode(node) {
  if (!isChromeVoxActive()) {
    return;
  }
  
  cvox.ChromeVox.navigationManager.switchToStrategy(
      cvox.ChromeVoxNavigationManager.STRATEGIES.LINEARDOM, 0, true);  
  cvox.ChromeVox.navigationManager.syncToNode(node);
  cvox.ChromeVoxUserCommands.finishNavCommand('');
  var target = node;
  while (target.firstChild) {
    target = target.firstChild;
  }
  cvox.ChromeVox.navigationManager.syncToNode(target);
};

function speakNextItem() {
  if (!isChromeVoxActive()) {
    return;
  }
  
  cvox.ChromeVox.navigationManager.switchToStrategy(
      cvox.ChromeVoxNavigationManager.STRATEGIES.LINEARDOM, 0, true);
  cvox.ChromeVox.navigationManager.next(true);
  if (!cvox.DomUtil.isDescendantOfNode(
      cvox.ChromeVox.navigationManager.getCurrentNode(), slideEls[curSlide])){
    var target = slideEls[curSlide];
    while (target.firstChild) {
      target = target.firstChild;
    }
    cvox.ChromeVox.navigationManager.syncToNode(target);
    cvox.ChromeVox.navigationManager.next(true);
  }
  cvox.ChromeVoxUserCommands.finishNavCommand('');
};

function speakPrevItem() {
  if (!isChromeVoxActive()) {
    return;
  }
  
  cvox.ChromeVox.navigationManager.switchToStrategy(
      cvox.ChromeVoxNavigationManager.STRATEGIES.LINEARDOM, 0, true);
  cvox.ChromeVox.navigationManager.previous(true);
  if (!cvox.DomUtil.isDescendantOfNode(
      cvox.ChromeVox.navigationManager.getCurrentNode(), slideEls[curSlide])){
    var target = slideEls[curSlide];
    while (target.lastChild){
      target = target.lastChild;
    }
    cvox.ChromeVox.navigationManager.syncToNode(target);
    cvox.ChromeVox.navigationManager.previous(true);
  }
  cvox.ChromeVoxUserCommands.finishNavCommand('');
};

// 현재 위치(`location`)로 부터 현재 슬라이드를 나타내는 hash 부분 ("#1")을 가져와 숫자부분만을 분리하고 `curSlide`를 업데이트 한다.
function getCurSlideFromHash() {
  var slideNo = parseInt(location.hash.substr(1));

  if (slideNo) {
    curSlide = slideNo - 1;
  } else {
    curSlide = 0;
  }
};

function updateHash() {
  location.replace('#' + (curSlide + 1));
};

// 키 이벤트를 받아 `nextSlide` 또는 `prevSlide` 메소드로 처리한다.
function handleBodyKeyDown(event) {
  switch (event.keyCode) {
    case 39: // right arrow
    case 13: // Enter
    case 32: // space
    case 34: // PgDn
      nextSlide();
      event.preventDefault();
      break;

    case 37: // left arrow
    case 8: // Backspace
    case 33: // PgUp
      prevSlide();
      event.preventDefault();
      break;

    case 40: // down arrow
      if (isChromeVoxActive()) {
        speakNextItem();
      } else {
        nextSlide();
      }
      event.preventDefault();
      break;

    case 38: // up arrow
      if (isChromeVoxActive()) {
        speakPrevItem();
      } else {
        prevSlide();
      }
      event.preventDefault();
      break;
  }
};

function addEventListeners() {
  document.addEventListener('keydown', handleBodyKeyDown, false);  
};

// `<pre>` 태그를 쿼리해, `noprettyprint` 가 없으면 아래와 같이 클래스에 
// `prettyprint`를 추가한다.
// 
//     <pre class="prettyprint">
// 
// dom에 `prettyfy.js` 스크립트를 추가하고, 해당 dom이 로드되면 `prettyPrint`
// 메소드를 실행해 syntax highlight.
function addPrettify() {
  var els = document.querySelectorAll('pre');
  for (var i = 0, el; el = els[i]; i++) {
    if (!el.classList.contains('noprettyprint')) {
      el.classList.add('prettyprint');
    }
  }
  
  var el = document.createElement('script');
  el.type = 'text/javascript';
  el.src = PERMANENT_URL_PREFIX + 'prettify.js';
  el.onload = function() {
    prettyPrint();
  }
  document.body.appendChild(el);
};

function addFontStyle() {
  var el = document.createElement('link');
  el.rel = 'stylesheet';
  el.type = 'text/css';
  el.href = 'http://fonts.googleapis.com/css?family=' +
            'Open+Sans:regular,semibold,italic,italicsemibold|Droid+Sans+Mono';

  document.body.appendChild(el);
};

// dom의 header에 `style.css`, `viewport`, `apple` 관련 앨리먼트들을 붙인다.
function addGeneralStyle() {
  var el = document.createElement('link');
  el.rel = 'stylesheet';
  el.type = 'text/css';
  //el.href = PERMANENT_URL_PREFIX + 'styles.css';
  el.href = 'styles.css';
  document.body.appendChild(el);
  
  var el = document.createElement('meta');
  el.name = 'viewport';
  el.content = 'width=1100,height=750';
  document.querySelector('head').appendChild(el);
  
  var el = document.createElement('meta');
  el.name = 'apple-mobile-web-app-capable';
  el.content = 'yes';
  document.querySelector('head').appendChild(el);
};

// `slideEls`를 돌며 각 슬라이드마다
// `.build > *`를 가져와 `to-build`를 붙인다.
function makeBuildLists() {
  for (var i = curSlide, slide; slide = slideEls[i]; i++) {
    var items = slide.querySelectorAll('.build > *');
    for (var j = 0, item; item = items[j]; j++) {
      if (item.classList) {
        item.classList.add('to-build');
      }
    }
  }
};

// 최초 Dom이 로드되면 실행되는 함수.
// 
// 1. 전체 Dom에서 `section.slides > article`를 가져와 저장
// 2. `iframe`을 세팅하고
// 3. css 스타일을 적용하고(`link` 태그)
// 4. prettify를 적용하고(`script` 태그)
// 5. `keydown` 이벤트 리스너를 등록한다.
// 6. 현재 슬라이드 Dom을 기준으로 전,후의 Dom에 `SLIDE_CLASSES` 를 업데이트 한다.
// 7. 현재 슬라이드 좌우에 터치 이벤트를 받을 영역을 설정
// 8. `speakAndSyncToNode` 실행을 위해 빌드 리스트 를 만든다.
// 
// 이 이후에는 사용자 이벤트에 의해 `handleBodyKeyDown`, `handleTouchStart` 메소드로 연결됨
function handleDomLoaded() {
  slideEls = document.querySelectorAll('section.slides > article');

  setupFrames();

  addFontStyle();
  addGeneralStyle();
  addPrettify();
  addEventListeners();

  updateSlides();

  setupInteraction();
  makeBuildLists();

  document.body.classList.add('loaded');
};

// 제일 처음 실행되는 함수.
// slide 번호를 업데이트 한다.
// `window` 의 `_DCL` 을 확인하고, handleDomLoaded를 바로 실행하거나, 이벤트 리스너로 등록한다.
// (`_DCL`이 뭐지??)
function initialize() {
  getCurSlideFromHash();

  if (window['_DEBUG']) {
    PERMANENT_URL_PREFIX = '../';
  }

  if (window['_DCL']) {
    handleDomLoaded();
  } else {
    document.addEventListener('DOMContentLoaded', handleDomLoaded, false);
  }
}

// ### Initialization
// Debug 모드일 경우 로컬의 `slides.js`를 가져오게 되어 있는데 난 항상 로컬로 돌리므로 그냥 진행하면 될 듯
if (!window['_DEBUG'] && document.location.href.indexOf('?debug') !== -1) {
  document.addEventListener('DOMContentLoaded', function() {
    // Avoid missing the DomContentLoaded event
    window['_DCL'] = true
  }, false);

  window['_DEBUG'] = true;
  var script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = '../slides.js';
  var s = document.getElementsByTagName('script')[0];
  s.parentNode.insertBefore(script, s);

  // Remove this script
  s.parentNode.removeChild(s);
} else {
  initialize();
}
