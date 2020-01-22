// setting the stuff we need for node (still need to fix deps)
const express = require('express');

const app = express();
const {
  Pool,
} = require('pg');
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

// set our resources and pages
app.get('/', (req, res) => {
  res.render('index.ejs');
});
app.use('/css', express.static(`${__dirname}/css`));
app.use('/resources', express.static(`${__dirname}/resources`));

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'notes',
  password: 'password',
  port: 5432,
});

function timestuffs(timepsql) {
  const then = Date.parse(timepsql);
  const now = Date.now();
  const diff = now - then;
  const mseconds = diff * 0.001;
  const years = mseconds / 31536000;
  const minutes = (years * 365 * 24 * 60);
  // const testtime = (years * 365*24*60);
  // console.log(testtime);
  return minutes;
}

function onNewUuid(uuidInfo) {
  const text = 'update users set uuid = $3, last_login = now() where username = $1 and password = $2';
  pool.query(text, uuidInfo, (err, res) => {
    if (err) {
      console.log(err);
      // console.log(uuidInfo)
    } else {
      (
        console.log(res, uuidInfo, 'new signin and uuid')
      );
    }
  });
}

function getNotes(username) {
  const selection = 'select * from saved_notes where username = $1 order by noteid desc';
  pool.query(selection, [username], (err, res) => {
    if (err) {
      console.log(err);
    } else {
      console.log(`sending notes for ${username}`);
      const notesend = [res, username];
      io.emit('noteSend', notesend);
    }
  });
}

function deleteNote(theNote) {
  const selection = 'select last_login, username from users where uuid=$1;';
  pool.query(selection, [theNote[1]], (err, res) => {
    console.log(`note${theNote[0]} deleted by ${res.rows[0].username}`);
    const lastcheck = timestuffs(res.rows[0].last_login);
    if (lastcheck < 240) {
      // console.log(`Note ${theNote[0]} Deleted`)
      pool.query('Delete from saved_notes where noteid=$1', [theNote[0]]);
    } else {
      console.log('Either bad UUID or session is timed out');
    }
  });
}


function onuuidauth(uuid) {
  console.log('uuid auth', uuid);
  const call = 'select * from users where uuid= $1';
  pool.query(call, [uuid], (err, res) => {
    if (err) {
      console.log(err);
    } else {
      const lasttime = timestuffs(res.rows[0].last_login);
      console.log(lasttime);
      if (lasttime < 240) {
        const sendinfo = [true, res.rows[0].username, true];
        pool.query('update users set last_login = now() where uuid = $1', [uuid]);
        io.emit('authEmit', sendinfo);
      }
    }
  });
}

function newnote(note) {
  console.log('new note recived');
  const usernameQuery = 'select username, last_login from users where uuid=$1';
  pool.query(usernameQuery, [note[3]], (err, res) => {
    if (err) {
      console.error(err);
    } else {
      const username01 = res.rows[0].username;
      //console.log(note);
      //console.log(res);
      const lastcheck = timestuffs(res.rows[0].last_login);
      if (lastcheck < 240) {
        const addNoteQuery = 'insert into saved_notes (username, note, created, checked, connection) values ($1, $2, $4, \'f\', $3)';
        //console.log('seems to have worked', addNoteQuery, [username01, note[0], note[1], note[2]]);
        pool.query(addNoteQuery, [username01, note[0], note[1], note[2]]);
      } else {
        console.warn('user has not been active in the last four hours and has attempted to save a new comment');
      }
    }
  });
}

function onsignin(signinfo) {
  console.log(`sign in attempt ${signinfo}`);
  const text = 'select * from users where password=$2 and username=$1';
  pool.query(text, signinfo, (err, res) => {
    if (err) {
      console.log(err);
    } else if (res.rowCount !== 0) {
      console.log(res);
      const emitinf = [true, signinfo[0]];
      console.log(emitinf);
      io.emit('authEmit', emitinf);
    } else {
      io.emit('authEmit', [false, signinfo[0]]);
    }
  });
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
  socket.on('newNote', newnote);
  socket.on('deletenote', deleteNote);
});


const server = http.listen(8089, () => {
  console.log('listening on *:8089');
});
