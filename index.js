(async function () {
  const seriesData = await fetchSeriesData()
    console.log('seriesData: ', seriesData)
    kLine.processSeriesData(seriesData);
    subcribe(data => { // data: [time, open, high, low, close]
      
      if(data[0]!=_.last(kLine.kData)[0]){
        kLine.cleanCanvas();
        kLine.processSeriesData(data);
      }
      console.log('subcribe: ', data)
    })

  // [time, open, high, low, close][]
  function fetchSeriesData() {
    return new Promise((resolve, reject) => {
      fetch('https://www.binance.com/api/v1/klines?symbol=BTCUSDT&interval=1m')
        .then(async res => {
          const data = await res.json()
          const result = data.map(([time, open, high, low, close]) => [time, open, high, low, close])
          resolve(result)
        })
        .catch(e => reject(e))
    })
  }
  function subcribe(success) {
    try {
      const socket = new WebSocket('wss://stream.binance.com/stream?streams=btcusdt@kline_1m')
      socket.onmessage = e => {
        const res = JSON.parse(e.data)
        const { t, o, h, l, c } = res.data.k
        success([t, o, h, l, c]);
      }
    } catch(e) {
      console.error(e.message)
    }
  }
})()

const INTERVAL = 5;
const PADDING = 1.5;
const START_X = 5;
const BLOCK_WIDTH = 3;
const UP_COLOR = "#00FF00";
const DOWN_COLOR = "#FF0000";
const CANVAS_PADDING = 0;
const Y_AXIS_INTERVAL =  20;
const Y_AXIS_PADDING = 100;
const INTERVAL_PADDING = 2
const DATA_FIELDS = 5;
const DATA_INTERVAL = 50;

function KLine(id, options) {
  var c = document.getElementById(id);
  var ctx = c.getContext("2d");
  this.ctx = ctx;
  this.canvas = c;
  this.maxValue = -1;
  this.minValue = -1;
  this.ratio = -1;
  this.kData = [];
}

KLine.prototype.processSeriesData= function(data){
    let interval = ((this.canvas.width - Y_AXIS_PADDING) / INTERVAL) - INTERVAL_PADDING;
    if(data.length > interval){
        let total =  data.slice(-1*interval);
        this.kData = total;
    }else if( typeof(data[0]) === "number"){
      if(_.last(this.kData)[0]!=data[0]){
        this.kData = _.drop(this.kData);
        this.kData.push(data);
      }
    }else{
      this.kData = data;
    }

  let maxMinData = [];
  
  for(let i = 1;i<DATA_FIELDS;i++){
    maxMinData.push(_.maxBy(this.kData, function(o) { return o[i]; })[i]);
    maxMinData.push(_.minBy(this.kData, function(o) { return o[i]; })[i]);
  }
  
  this.maxValue = Big(_.max(maxMinData)).add(100);
  this.minValue = Big(_.min(maxMinData)).minus(100);
  this.ratio =  (this.canvas.height - CANVAS_PADDING) / this.maxValue.minus(this.minValue); 
  this.interval = this.maxValue.minus(this.minValue);
  this.ctx.fillStyle = "black";
  this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  this.drawYAxis();
  this.drawBlock();
}

KLine.prototype.drawYAxis = function(){
    let x = this.canvas.width-Y_AXIS_PADDING;
    this.ctx.beginPath();
    this.ctx.moveTo(x, 0);
    this.ctx.lineTo(x, this.canvas.height);
    this.YAxisInterval = Big(this.canvas.height).div(Y_AXIS_INTERVAL).toPrecision(5);
    this.ctx.strokeStyle="gray";
    this.ctx.closePath();
    this.ctx.stroke();
    let t = Math.round(this.minValue.toPrecision(7)).toFixed(2);
    let interval = DATA_INTERVAL;
    for(let i = 1 ;i< Y_AXIS_INTERVAL;i++){
      this.ctx.font = "15px Arial";
      this.ctx.fillStyle = "gray";
      let s = Big(t).add(i*interval).toFixed(2);
      console.log("s",s);
      this.ctx.fillText("---"+s, this.canvas.width-Y_AXIS_PADDING,this.calculateY(s));
    }
}

KLine.prototype.drawBlock = function(){
  for(let i = 0; i< this.kData.length;i++){
    this.ctx.beginPath();
    console.log(this.kData[i]);
    let open_price = this.calculateY(this.kData[i][1]); 
    let high_price = this.calculateY(this.kData[i][2]); 
    let low_price = this.calculateY(this.kData[i][3]); 
    let close_price = this.calculateY(this.kData[i][4]);
    
    let priceColor = UP_COLOR;
    if(open_price < close_price) priceColor = DOWN_COLOR;
    
    let x= START_X+i*INTERVAL+PADDING;
    this.ctx.moveTo(x, high_price);
    this.ctx.lineTo(x, low_price);
    this.ctx.strokeStyle=priceColor;
    this.ctx.closePath();
    this.ctx.stroke();
    this.ctx.fillStyle = priceColor;
    this.ctx.fillRect(x-PADDING, open_price,BLOCK_WIDTH, Math.abs(open_price-close_price));
  }
}

KLine.prototype.calculateY = function(value){
  let x = Big(value);
  let y = x.minus(this.minValue).div(this.interval)
  let r = Big(this.ratio);
  return y*this.canvas.height;
}

KLine.prototype.cleanCanvas = function(){
  this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
}
