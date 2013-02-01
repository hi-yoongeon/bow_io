
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path');

var Chat = require('./chat');
var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 8000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);
app.get('/users', user.list);
/*
app.get('/join/:id', function(req, res) {
  var isSuccess = false
    , roomName = req.params.id;

  if (Chat.hasRoom(roomName)) {
    isSuccess = true; 
  }

  res.render('room', {
      isSuccess: isSuccess
    , roomName: roomName
    , nickName: req.session.nickname
    , attendants: Chat.getAttendantsList(roomName)
  });
});
*/

var lserver = http.createServer(app);
lserver.listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

var redis = require("redis"),
//daum redis server setting
client = redis.createClient(6379, "cache3.rc2.9rum.cc");
client.auth("f7f9c6ac-dc70-4558-8958-aa9a194822e4", function() {console.log("Connected!");});

console.log(client);
client.on("error", function (err) {
  console.log("Error " + err);
});

var io = require('socket.io');
var io = io.listen(lserver);
var another = io.of('/chat').on('connection', function (socket) {

  var joinedRoom = null;

  socket.on('join', function(data) {
      joinedRoom = data.roomName;
      socket.join(joinedRoom);
      socket.emit('joined', {
        isSuccess:true, nickName:data.nickName
      });
      socket.broadcast.to(joinedRoom).emit('joined', {
        isSuccess:true, nickName:data.nickName
      });      
  });

  //이전대화 보기
  socket.on('showPreTalk', function(data) {
    if (joinedRoom) {
      client.lrange(joinedRoom, 0, -1, function (err, obj) {
        console.dir(obj);
        socket.emit('preTalked', {
          isSuccess:true, preTalk:obj
        });
      });
    }
  });

  socket.on('message', function(data) {
    if (joinedRoom) {
      console.log(data);
      client.rpush(joinedRoom, data.nickName+"_{}_"+data.msg);
      socket.broadcast.to(joinedRoom).json.send(data);
    } 
  });

  socket.on('leave', function(data) {  
    if (joinedRoom) {      
      socket.broadcast.to(joinedRoom).emit('leaved', {
        nickName:data.nickName
      });
      client.quit();
      socket.leave(joinedRoom);
    }else{
      console.log("dont leave");
    }
  });
    
});

