;(function(){

let presets = {
  svgWidth: 142, //Длина(ее пропорция) viewBox в сторонней свгшке
  svgHeight: 62, //Высота(ее пропорция) viewBox в сторонней свгшке
  grayscaleBGCopy: true, //Нужна ли серая копия свгшки бэкграундом?
  maskBGColor: '#333', //хексы длиной 7 и 4 символа
  picPath: 'assets/img/progress_v5.svg', //Путь к сторонней свгшке. Она должна грузится как можно раньше, поэтому эту часть нужно продублировать в html в head, по типу: <link rel="preload" href="assets/img/visa-5.svg" as="image">
  debugOn: true, //Выводить дебаг текст или нет
}
for (let index = 0; index < document.scripts.length; index++) {
  if (document.scripts[index].src.split('/').pop() ==='accubar.js') {
    //Возможно нужно добавить проверку на валидность данных
    if (document.scripts[index].getAttribute('data-svgw')) presets.svgWidth = +document.scripts[index].getAttribute('data-svgw')
    if (document.scripts[index].getAttribute('data-svgh')) presets.svgHeight = +document.scripts[index].getAttribute('data-svgh')
    if (document.scripts[index].getAttribute('data-grayscale') == "false") presets.grayscaleBGCopy = false
    if (document.scripts[index].getAttribute('data-picPath')) presets.picPath = document.scripts[index].getAttribute('data-picPath')
    if (document.scripts[index].getAttribute('data-maskbg')) presets.maskBGColor = document.scripts[index].getAttribute('data-maskbg')
    if (document.scripts[index].getAttribute('data-debug') == "false") presets.debugOn = false
    break;
  }
}






////////////////////////////////

//конвертация hex в 0-1
function hexToFe(hex) {
  let r, g, b //красный, зеленый, голубой
  if (hex.length==7) {
    r = parseInt(hex.substring(1,3),16) / 255
    g = parseInt(hex.substring(3,5),16) / 255
    b = parseInt(hex.substring(5,7),16) / 255
  } else if (hex.length==4) {
    r = parseInt(hex.substring(1,2),16) / 15
    g = parseInt(hex.substring(2,3),16) / 15
    b = parseInt(hex.substring(3,4),16) / 15
  }
  return r.toFixed(2) +" 0 0 0 0 0 " + g.toFixed(2) + " 0 0 0 0 0 " + b.toFixed(2) + " 0 0 0 0 0 1 0"
}

//Все глобальные переменные
var startTime = new Date().getTime(),
    bar = document.createElement('div'),
    stat = document.createElement('div'), //элемент с текстом процентов под логотипом
    timeStamps = [], //хранить время загрузки всех предыдущих ресурсов, чтобы можно было рассчитать среднее время загрузки одного ресурса и поставить скорость анимации с учетом этого
    currentProgress = 0, //текущий прогресс
    totalProgressCap = 3 //2 изначально - по 1 на обе documentreadystate, и еще 1 на loadbar, чтобы до добавления всех картинок не вышел


function initBarElement(){
  if (presets.debugOn) console.log('initBarElement time: ',((new Date().getTime() - startTime) / 1000).toFixed(2) + 's')
  var svgCode = `
    <svg class="inner-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${presets.svgWidth + 1} ${presets.svgHeight}">
      <defs>
        <mask id="myMask">
          <rect id="mask" x="${-presets.svgWidth}" y="0" width="${presets.svgWidth}" height="${presets.svgHeight}" fill="#fff"></rect>
        </mask>
        <filter id="composite">
          <feColorMatrix type="saturate" in="SourceGraphic" result="B" values="0.1"/>
          <feComponentTransfer in="B" result="C">
            <feFuncR type="linear" slope="30"/>
            <feFuncG type="linear" slope="30"/>
            <feFuncB type="linear" slope="30"/>
          </feComponentTransfer>
          <feColorMatrix type="matrix" in="C" values="${hexToFe(presets.maskBGColor)}" />
        </filter>
      </defs>
      ${presets.grayscaleBGCopy ? `<image filter="url(#composite)" xlink:href="${presets.picPath}" x="0" y="0" preserveAspectRatio="none" width="${presets.svgWidth}" height="${presets.svgHeight}" />` : ''}
      <image mask="url(#myMask)" xlink:href="${presets.picPath}" x="0" y="0" preserveAspectRatio="none" width="${presets.svgWidth}" height="${presets.svgHeight}" />
    </svg>
  `
  bar.innerHTML = svgCode
  bar.appendChild(stat)
  bar.classList.add('accubar')
  document.body.appendChild(bar)
}


function resourceLoaded(){
  var perc = 0
  currentProgress += 1;
  perc = 100 / (totalProgressCap + document.scripts.length) * (currentProgress + document.scripts.length)
  document.getElementById('mask').style.transform = 'translateX(' + (perc / 100) * presets.svgWidth + 'px)'
  
  stat.textContent = "Loading " + (perc << 0) +"%"
  
  let tmpTime = ((new Date().getTime() - startTime) / 1000).toFixed(2)
  timeStamps.push(tmpTime)
  let animTime = tmpTime / (timeStamps.length + 0.15)
  if (animTime < 0.5) animTime = 0.5 // если очень быстро, то замедляем
  if(currentProgress === totalProgressCap && animTime>0.6) animTime == 0.6
  document.getElementById('mask').style.transitionDuration = animTime + 's'

  if(currentProgress === totalProgressCap) return doneLoading()
}
function doneLoading(){
  if (presets.debugOn) console.log('done time: ',((new Date().getTime() - startTime) / 1000).toFixed(2) + 's')
  setTimeout(function(){
    bar.style.transitionDuration = '0.5s'
    bar.style.opacity = 0;
    setTimeout(function(){
      bar.style.display = "none";
    }, 500)
    
    if (presets.debugOn) console.log('bar opacity-out start: ',((new Date().getTime() - startTime) / 1000).toFixed(2) + 's')
  }, 600);
}
function loadbar() {
  if (presets.debugOn) console.log('loadbar time: ',((new Date().getTime() - startTime) / 1000).toFixed(2) + 's')
  var imgs = document.images
  totalProgressCap = totalProgressCap + imgs.length
  
  for(var i=0; i<imgs.length; i++) {
    var tImg     = new Image();
    tImg.onload  = resourceLoaded;
    tImg.onerror = resourceLoaded;
    tImg.src     = imgs[i].src;
  }
  currentProgress += 1
}

document.addEventListener('readystatechange', function () {
  if (document.readyState == 'interactive') currentProgress += 1
  if (document.readyState == 'complete') resourceLoaded()
  if (presets.debugOn) console.log(document.readyState, ((new Date().getTime() - startTime) / 1000).toFixed(2) + 's')
})

function start() {
  try {
    initBarElement()
  } catch (_error) {}
  if (!document.querySelector('.accubar')) {
    //если не добавилось пробуй запустить через 20мс
    return setTimeout(start, 20)
  }
}
start() //Мы можем прикрепить бар еще до DOMContentLoaded
document.addEventListener('DOMContentLoaded', loadbar, false);

}());