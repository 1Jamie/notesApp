// make some vars here so they dont come back as not existing
let info;

// setup our uuid generator
function create_UUID() {
  let dt = new Date().getTime();
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (dt + Math.random() * 16) % 16 | 0;
    dt = Math.floor(dt / 16);
    return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
  $.cookie('uuid', uuid);
  return uuid;
}

// Go ahead and setup the auth function
function auth() {
  let socket = io.connect('localhost:8089');
  socket.on('authEmit', (conInfo) => {
    if (info === null) {
      info = [$.cookie('uuid')];
    }
    if ((conInfo[0] === true && info[0] === conInfo[1]) || (conInfo[0] === true && conInfo[2] === true)) {
      console.log(conInfo);
      $('#logContainer').remove();
      if (conInfo[2] !== true) {
        const uuid = create_UUID();
        const uuidInfo = [info[0], info[1], uuid];
        console.log(uuidInfo);
        socket.emit('newuuid', uuidInfo);
      }
      socket.emit('getNotes', conInfo[1]);
      socket.on('noteSend', loadnotes);
    } else if (conInfo[0] === false && info[0] === conInfo[1]) {
      socket = null;
      $('<p style="color: red;" >Incorrect Username or Password</p>').insertBefore('#userName').delay(10000)
        .fadeOut(100);
    } else {
      socket = null;
      console.log('else hit, check send');
    }
  });
}

// this is gonna handle the login once the button is clicked
function login() {
  event.preventDefault();
  info = [$('#userName').val(), $('#password').val()];
  const socket = io.connect('localhost:8089');
  console.log('button clicked');
  console.log(info);
  socket.emit('signIn', info);
  auth();
  return info;
}
// this is going to handle auth for both uuid and username auth, we are gonna see if we have a
// null info which means it was uuid
// if its null we are gonna set the info to the uuid, we are gonna get back the auth status true or
// false, the uuid to make sure its the right person getting it
// and i cant for the life of me remember why i have a second true coming back after
// the uuid coming back... oh yea, its to say its uuid XD

function deleteNote(elem) {
  console.log(`${elem.srcElement.dataset.indexNumber}`);
  const conf = true;
  if (conf === true) {
    const deleteobj = [`${elem.srcElement.dataset.indexNumber}`, $.cookie('uuid')];
    socket.emit('deletenote', deleteobj);
    console.log(deleteobj);
  } else {
    console.log('command not deleted');
  }
}

function newcomment() {
  // event.preventDefault();
  const datetime = new Date().toLocaleString();
  const sendinfo = [$('#newNote').val(), $('#topic').val(), datetime, $.cookie('uuid')];
  console.log(sendinfo);
  socket.emit('newNote', sendinfo);
}


function stopedTyping() {
  if ($(this).val() === '' || $('#topic').val() === '') {
    $('#saving').attr('disabled', true);
  } else {
    $('#saving').prop('disabled', false);
  }
}

function loadnotes(notes) {
  // let note = notes[1].rows[0].note
  console.log(notes);
  const $loggedInAs = (
    $('<p id="name" style=\'display: inline-block;\' class=\'w3-pannel w3-blue w3-card-4 w3-padding w3-teal\'>')
      .data('name', notes[0].rows[0].username)
      .text(`Logged in as ${notes[0].rows[0].username}`)
  );
  $('#main').append('<div id=\'loggedin\'></div>');
  $('#loggedin').append($loggedInAs);
  $('#main').append('<br>');
  $('#main').append('<form id=\'notesDiv\' class=\'notesDiv\'></div>');
  $('#notesDiv').append('<table id=\'notes\' class = \'w3-border w3-teal\' class="notesTable"> </table>');
  $('#notes').append('<tr id=\'noteIds\' class="idrows"><td id=\'idlabel\' class="idrows">ID</td></tr>');
  $('#notes').append('<tr id=\'noteTimes\' class="timerows"><td id="timeLabel" class="timerows">Time</td></tr>');
  $('#notes').append('<tr id=\'noteItself\' class="noterows"><td id="noteITself" class="noterows">Note</td></tr>');
  $('#notes').append('<tr id=\'noteDelete\' class=\'delete\'><td id="noteDeleteRow" class=deleteBtn>Delete</td></tr>');
  notes[0].rows.forEach((element) => {
    console.log(element);
    $('#noteIds').append(`<td class='w3-padding w3-column idrows' id=${element.noteid}>${element.noteid}</td>`);
    $('#noteTimes').append(`<td class='w3-padding w3-column timerows' id='time${element.created}'>${element.created}</td>`);
    $('#noteItself').append(`<td class='w3-padding noterows' id='noteItself${element.note}'><div class='setshit'>${element.note}</div></td>`);
    $('#noteDelete').append(`<td class='w3-padding noterows' id ='delete${element.noteid}'><button data-index-number ='${element.noteid}' id='dltBtn${element.noteid}'>delete</button></td>`);
    const deleting = document.getElementById(`dltBtn${element.noteid}`);
    deleting.addEventListener('click', deleteNote);
  });
  $('#main').append('<br><form id=\'note-taking\' class=\'w3-container w3-light-grey\'</form>');
  $('#note-taking').append('<label>topic/case</lable>');
  $('#note-taking').append('<input style=\'height:50%\' class=\'w3-input w3-padding w3-border w3-large-round\' id=\'topic\' type=\'text\'></input>');
  $('#note-taking').append('<label>note</lable>');
  $('#note-taking').append('<textarea style=\'height: 50%\' rows=\'6\' class=\'w3-input w3-padding w3-border w3-large-round\' id=\'newNote\' type=\'text\'></textarea>');
  $('#note-taking').append('<button disabled=\'true\' id=\'saving\' class=\'w3-button w3-border w3-large-round\'>save</button>');
  $('#newNote').keydown(stopedTyping);
  $('#saving').click(newcomment);
}

// this is just the click event, not sure where i wanna put it
$(document).ready(() => {
  $('#login').click(login);
  // this is gonna check if we have a uuid cookie and if we do were gonna ask the server if its still valid
  if ($.cookie('uuid')) {
    const socket = io.connect('localhost:8089');
    socket.emit('uuidauth', $.cookie('uuid'));
    console.log($.cookie('uuid'));
    auth();
  }
});
