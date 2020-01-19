//setting the stuff we need for node (still need to fix deps)
const express = require('express');
const app = express();
const {
  Pool
} = require('pg');
const http = require('http').Server(app);
const io = require('socket.io')(http);
app.use(express.static('public'));

//set our resources and pages
app.get('/', (req, res) => {
  res.render('index.ejs');
});
app.use('/css', express.static(`${__dirname}/css`));
app.use('/resources', express.static(`${__dirname}/resources`))

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'notes',
  port: 5432,
});

function timestuffs(timepsql) {
  const then = Date.parse(timepsql);
  const now = Date.now();
  const diff = now - then;
  const _seconds = diff * 0.001;
  const seconds = _seconds % 60;
  const minutes = _seconds / 60 % 60;
  const hours = _seconds / 3600 % 24;
  const days = _seconds / 86400 % 365;
  const years = _seconds / 31536000;
  const text = ['years', 'days', 'hours', 'minutes', 'seconds'];
  //console.log([years, days, hours, minutes, seconds].map((n, i) => Math.floor(n) + ' ' + text[i]).join(', '));
  //console.log(minutes)
  return minutes;
}

function onNewUuid(uuidInfo) {
  const text = 'update users set uuid = $3, last_login = now() where username = $1 and password = $2'
  pool.query(text, uuidInfo, (err, res) => {
    if (err) {
      console.log(err);
      //console.log(uuidInfo)
    } else(
      console.log(res, uuidInfo, 'new signin and uuid')
    )
  })
}

function getNotes(username){
  let selection = 'select * from saved_notes where username = $1'
  pool.query(selection, [username], (err, res) => {
    if (err) {
      console.log(err)
    } else {
      console.log('sending notes for ' + username);
      let notesend = [res, username]
      io.emit('noteSend', notesend)
    }
  })
}

function onuuidauth(uuid) {
  console.log('uuid auth', uuid);
  let call = 'select * from users where uuid= $1'
  pool.query(call, [uuid], (err, res) => {
    if (err) {
      console.log(err)
    } else {
      let lasttime = timestuffs(res.rows[0].last_login)
      console.log(lasttime)
      if (lasttime < 30) {
        let sendinfo = [true, res.rows[0].username, true]
        pool.query('update users set last_login = now() where uuid = $1', [uuid]);
        io.emit('authEmit', sendinfo)
      }
    }
  })

}

function onsignin(signinfo) {
  console.log('sign in attempt ' + signinfo)
  const text = 'select * from users where password=$2 and username=$1'
  pool.query(text, signinfo, (err, res) => {
    if (err) {
      console.log(err);
    } else {
      if (res.rowCount != 0) {
        console.log(res);
        let emitinf = [true, signinfo[0]]
        console.log(emitinf)
        io.emit('authEmit', emitinf)
      } else {
        io.emit('authEmit', [false, signinfo[0]])
      }
    }
  })
}

io.sockets.on('connection', (socket) => {
  socket.on('username', (username) => {
    socket.username = username;
    // console.log(  `user ${socket.username} connected`,);
  });
  socket.on('signIn', onsignin);
  socket.on('uuidauth', onuuidauth);
  socket.on('newuuid', onNewUuid);
  socket.on('getNotes', getNotes);
});


const server = http.listen(8089, () => {
  console.log('listening on *:8089');
});