//TODOS: 
//animate inbetween progress gradually
//FADEOUT ANIMATION FOR LOADER DISAPPEARENCE
//delete the bar element
var presets = {
  presetImagesCount: 0,//reset on interactive, so no accidentaly endless waiting
  fakeProgressPoints: 0,//each added as setTimer callback after the complete loading of doc, dont implement it for now
  svgWidth: 142,
  ghostTime: 300,//WHEN 100% reached, how long to wait before hiding
}

var image_array = document.getElementsByTagName("img");
var image_count = image_array.length
console.log('!!!',image_count)


var composite = {
  realProgress: 0, //measured in points, convert when drawing
  animatedProgress: 0, //should be less than real progress most of the time
  progressCap: 3, //maximum points to track, like 1 point per pic, 3 point on interactive state change
  
  documentReadyState: 0,
  doneImages: 0,
  //imageCount: 0, //images that got listener take that from length of images
  imageCollection: [],//maybe resetting the collection each time can be optimized
  images: []
  //elements,
  //ajax
}

/*var tester = setInterval(()=>{
  
  if (document.getElementsByTagName('body').length > 0) {
    console.log('tester KILLED')
    clearInterval(tester)
  }
  
},20)
*/

//dont forget to kill the tracker in the end
var tracker = setInterval(()=>{
  for (let i = 0, icount=composite.images.length; i < icount; i++){
    console.log('all: ', composite.images.length)
    if (composite.imageCollection[composite.images[i]].complete) {
      console.log('complete: ', i)
      composite.images.splice(i,1)
      composite.doneImages += 1
      break;//one at a time
      //composite.imageCollection = 

    }
  }
  //progress change
  let oldProgress = composite.realProgress
  composite.realProgress = composite.doneImages * 2 + composite.documentReadyState * 3
  if (composite.imageCollection.length == composite.images.length + composite.doneImages) {
    composite.progressCap = composite.imageCollection.length * 2 + 3
  } else {
    composite.progressCap = composite.images.length * 2 + 3
    console.log('UNSYNCRONIZED')
    //duno wot to do if this happens yet
  }
  console.log(`progress: ${composite.realProgress} / ${composite.progressCap}`)
  //kill self
  if (composite.progressCap === composite.realProgress) {
    clearInterval(tracker)
    console.log('TRACKER KILLED')
  }
  
  barAnimateProgress()
},50)

document.onreadystatechange = () => {
  console.log('readyStateChange: ',document.readyState)
  //composite.documentReadyState += 1//not sure if it is going to be needed in the future
  if (document.readyState == 'interactive') {
    initLoadingBar()
    composite.documentReadyState = 1
    composite.imageCollection = document.getElementsByTagName("img");
    composite.imageCount = image_array.length
    barAnimateProgress()
    for (let i = 0; i < composite.imageCount; i++){
      composite.images.push(i)
    }
    
    console.log('!!!',composite.images)
  }
}


//Another way of checking is use complete property
//TREAT ON ERROR ON THE IMAGES




let bar = document.createElement('div')
bar.innerHTML = `
<svg class="inner-svg" xmlns="http://www.w3.org/2000/svg" viewbox="0 0 142 62">
<defs>
<mask id="myMask" x="0" y="0">
<rect class="maskPart1" x="0" y="0" width="142" height="200" fill="white"></rect>
<rect class="maskPart2" x="0" y="0" width="142" height="200" fill="black"></rect>
</mask>
</defs>
<g fill="gray">
<path d="M63.62,38.25a10.23,10.23,0,0,0-4.89,1.3V28.91L53,30.18V59.84A17.45,17.45,0,0,0,61.1,62c5.78,0,11.23-3.33,11.23-12.15S67.57,38.25,63.62,38.25ZM61.09,59.07a7.93,7.93,0,0,1-2.36-.37V41.81a6.07,6.07,0,0,1,3.1-.49c1.57.15,4.61,1.43,4.61,8.78S63.43,59.07,61.09,59.07Z"/>
<path d="M87.94,38.25a10.19,10.19,0,0,0-4.89,1.3V28.91l-5.74,1.27V59.84A17.44,17.44,0,0,0,85.41,62c5.78,0,11.24-3.33,11.24-12.15S91.89,38.25,87.94,38.25ZM85.41,59.07a7.93,7.93,0,0,1-2.36-.37V41.81a6,6,0,0,1,3.09-.49c1.58.15,4.61,1.43,4.61,8.78S87.74,59.07,85.41,59.07Z"/>
<path d="M40.36,57.41a4.35,4.35,0,0,1-2.9,1.29c-4.29.36-4.12-4.7-4.12-4.7V37.65l-5.75,1.27v15s-.33,8,7.45,8a9.73,9.73,0,0,0,6.23-2l.61,1.1h4.23V37.65l-5.75,1.27Z"/>
<polygon points="14.93 43.63 5.93 43.63 5.93 28.21 0 29.52 0 61.03 5.93 61.03 5.93 46.98 14.93 46.98 14.93 61.03 20.86 61.03 20.86 28.21 14.93 29.52 14.93 43.63"/>
<path d="M131.19,33.43l9-18.9a10,10,0,1,0-17.94,0Zm0-30A6.64,6.64,0,1,1,124.56,10,6.64,6.64,0,0,1,131.19,3.4Z"/>
<path d="M131.2,14.76A4.73,4.73,0,0,0,135.92,10a5.36,5.36,0,0,0-.06-.69,2.82,2.82,0,0,1-4.76-2,2.77,2.77,0,0,1,.79-1.94,4,4,0,0,0-.69-.06,4.73,4.73,0,1,0,0,9.45Z"/>
<path d="M112.89,38.38a22.08,22.08,0,0,0-4.42-.32,22.51,22.51,0,0,0-3.15.27,20.34,20.34,0,0,0-2.81.63l-.61,2.25h5.57a6.54,6.54,0,0,1,3.82.9c.93.6,1.4,1.8,1.4,3.6v1.8c-.63-.12-1.3-.23-2-.31a15.75,15.75,0,0,0-2.2-.14,17.48,17.48,0,0,0-3.28.29,6.41,6.41,0,0,0-2.58,1.11,5.35,5.35,0,0,0-1.71,2.2,9,9,0,0,0-.62,3.6,9,9,0,0,0,.62,3.6,5.6,5.6,0,0,0,1.66,2.2A6,6,0,0,0,105,61.17a14.84,14.84,0,0,0,3,.29,8.66,8.66,0,0,0,3.38-.56,8.52,8.52,0,0,0,2.08-1.24h.25l.74,1.35H118V45.71a9.87,9.87,0,0,0-.65-3.85A6.12,6.12,0,0,0,112.89,38.38Zm-.2,19a5.38,5.38,0,0,1-3.14.9,5.05,5.05,0,0,1-1.32-.18,2.8,2.8,0,0,1-1.19-.66,3.52,3.52,0,0,1-.87-1.26,4.83,4.83,0,0,1-.34-2,4.92,4.92,0,0,1,.34-2A3.71,3.71,0,0,1,107,51a2.89,2.89,0,0,1,1.19-.65,8.54,8.54,0,0,1,1.73-.18h2.73Z"/>
<path d="M138,40.72a6.88,6.88,0,0,0-3-2,13,13,0,0,0-8,0,6.19,6.19,0,0,0-2.75,2,9.49,9.49,0,0,0-1.84,3.62,19.69,19.69,0,0,0-.64,5.42,18.86,18.86,0,0,0,.67,5.42,8.57,8.57,0,0,0,2,3.62,7.21,7.21,0,0,0,3.27,2,17.51,17.51,0,0,0,5,.63,22.85,22.85,0,0,0,3.59-.27,19.91,19.91,0,0,0,2.86-.63l-.62-2.25h-4.84a6.31,6.31,0,0,1-4.69-1.55c-1-1-1.51-3-1.51-5.63h12.9V49.76a19.66,19.66,0,0,0-.65-5.42A9.63,9.63,0,0,0,138,40.72Zm-10.42,7.47a19.56,19.56,0,0,1,.27-3.6,7.62,7.62,0,0,1,.72-2.21A2.76,2.76,0,0,1,131.09,41a2.85,2.85,0,0,1,2.69,1.39,8,8,0,0,1,.71,2.21,18.61,18.61,0,0,1,.28,3.6Z"/>
</g>
<g class="color1" mask="url(#myMask)">
<path d="M63.62,38.25a10.23,10.23,0,0,0-4.89,1.3V28.91L53,30.18V59.84A17.45,17.45,0,0,0,61.1,62c5.78,0,11.23-3.33,11.23-12.15S67.57,38.25,63.62,38.25ZM61.09,59.07a7.93,7.93,0,0,1-2.36-.37V41.81a6.07,6.07,0,0,1,3.1-.49c1.57.15,4.61,1.43,4.61,8.78S63.43,59.07,61.09,59.07Z"/>
<path d="M87.94,38.25a10.19,10.19,0,0,0-4.89,1.3V28.91l-5.74,1.27V59.84A17.44,17.44,0,0,0,85.41,62c5.78,0,11.24-3.33,11.24-12.15S91.89,38.25,87.94,38.25ZM85.41,59.07a7.93,7.93,0,0,1-2.36-.37V41.81a6,6,0,0,1,3.09-.49c1.58.15,4.61,1.43,4.61,8.78S87.74,59.07,85.41,59.07Z"/>
<path d="M40.36,57.41a4.35,4.35,0,0,1-2.9,1.29c-4.29.36-4.12-4.7-4.12-4.7V37.65l-5.75,1.27v15s-.33,8,7.45,8a9.73,9.73,0,0,0,6.23-2l.61,1.1h4.23V37.65l-5.75,1.27Z"/>
<polygon points="14.93 43.63 5.93 43.63 5.93 28.21 0 29.52 0 61.03 5.93 61.03 5.93 46.98 14.93 46.98 14.93 61.03 20.86 61.03 20.86 28.21 14.93 29.52 14.93 43.63"/>
<path d="M131.19,33.43l9-18.9a10,10,0,1,0-17.94,0Zm0-30A6.64,6.64,0,1,1,124.56,10,6.64,6.64,0,0,1,131.19,3.4Z"/>
<path d="M131.2,14.76A4.73,4.73,0,0,0,135.92,10a5.36,5.36,0,0,0-.06-.69,2.82,2.82,0,0,1-4.76-2,2.77,2.77,0,0,1,.79-1.94,4,4,0,0,0-.69-.06,4.73,4.73,0,1,0,0,9.45Z"/>
<path d="M112.89,38.38a22.08,22.08,0,0,0-4.42-.32,22.51,22.51,0,0,0-3.15.27,20.34,20.34,0,0,0-2.81.63l-.61,2.25h5.57a6.54,6.54,0,0,1,3.82.9c.93.6,1.4,1.8,1.4,3.6v1.8c-.63-.12-1.3-.23-2-.31a15.75,15.75,0,0,0-2.2-.14,17.48,17.48,0,0,0-3.28.29,6.41,6.41,0,0,0-2.58,1.11,5.35,5.35,0,0,0-1.71,2.2,9,9,0,0,0-.62,3.6,9,9,0,0,0,.62,3.6,5.6,5.6,0,0,0,1.66,2.2A6,6,0,0,0,105,61.17a14.84,14.84,0,0,0,3,.29,8.66,8.66,0,0,0,3.38-.56,8.52,8.52,0,0,0,2.08-1.24h.25l.74,1.35H118V45.71a9.87,9.87,0,0,0-.65-3.85A6.12,6.12,0,0,0,112.89,38.38Zm-.2,19a5.38,5.38,0,0,1-3.14.9,5.05,5.05,0,0,1-1.32-.18,2.8,2.8,0,0,1-1.19-.66,3.52,3.52,0,0,1-.87-1.26,4.83,4.83,0,0,1-.34-2,4.92,4.92,0,0,1,.34-2A3.71,3.71,0,0,1,107,51a2.89,2.89,0,0,1,1.19-.65,8.54,8.54,0,0,1,1.73-.18h2.73Z"/>
<path d="M138,40.72a6.88,6.88,0,0,0-3-2,13,13,0,0,0-8,0,6.19,6.19,0,0,0-2.75,2,9.49,9.49,0,0,0-1.84,3.62,19.69,19.69,0,0,0-.64,5.42,18.86,18.86,0,0,0,.67,5.42,8.57,8.57,0,0,0,2,3.62,7.21,7.21,0,0,0,3.27,2,17.51,17.51,0,0,0,5,.63,22.85,22.85,0,0,0,3.59-.27,19.91,19.91,0,0,0,2.86-.63l-.62-2.25h-4.84a6.31,6.31,0,0,1-4.69-1.55c-1-1-1.51-3-1.51-5.63h12.9V49.76a19.66,19.66,0,0,0-.65-5.42A9.63,9.63,0,0,0,138,40.72Zm-10.42,7.47a19.56,19.56,0,0,1,.27-3.6,7.62,7.62,0,0,1,.72-2.21A2.76,2.76,0,0,1,131.09,41a2.85,2.85,0,0,1,2.69,1.39,8,8,0,0,1,.71,2.21,18.61,18.61,0,0,1,.28,3.6Z"/>
</g>
</svg>
<div class="debuggerTxt dbtxt1"></div>
<div class="debuggerTxt dbtxt2"></div>
<div class="debuggerTxt dbtxt3"></div>
`
bar.classList.add('accubar')

function initLoadingBar(){
  console.log('111',document.querySelector('body'))
  
  document.body.appendChild(bar)
}
function barAnimateProgress(){
  let perc = composite.realProgress / composite.progressCap
  document.getElementsByClassName('dbtxt1')[0].textContent = (perc * 100 | 0) + '%'
  document.getElementsByClassName('dbtxt2')[0].textContent = `document state: ${document.readyState} (${document.readyState == 'interactive' ? 2 : 3} / 3)`
  document.getElementsByClassName('dbtxt3')[0].textContent = `imgs: ${composite.doneImages} / ${composite.imageCollection.length}`
  document.getElementsByClassName('maskPart2')[0].setAttribute('x', perc* presets.svgWidth)
  if (perc === 1) {
    setTimeout(()=>{
      bar.style.display = 'none'
    },presets.ghostTime)
  }
}