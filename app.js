var express = require('express');
var path = require('path');         // (for view) 추가
const { urlencoded, json } = require('body-parser') ;
var indexRouter = require('./routes/index');
//var pageRouter = require('./routes/page');
var bodyParser = require("body-parser");    // 추가

const router = express.Router();

var app = express();

// (for view) 추가
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

/*app.get('/', function (req, res) {
    res.render('index.ejs');
});*/

app.listen(4040, function () {
    console.log("#21# app.js Node 동작 [port: 4040] ")
})

app.use(json());
app.use('/', indexRouter);
//app.use('/page', pageRouter);   // 추가

app.use(bodyParser.json());     // 데이터가 json으로 오면 받기
app.use(bodyParser.urlencoded({extended:true})); // 클라, 서버 간 데이터 주고받을 때 인코딩해서 보냄
app.use(express.static(path.join(__dirname, 'public')));

module.exports = router;