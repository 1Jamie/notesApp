let info;
    //this is gonna check if we have a uuid cookie and if we do were gonna ask the server if its still valid
    if ($.cookie('uuid')) {
      var socket = io.connect('localhost:8089');
      socket.emit('uuidauth', $.cookie('uuid'))
      console.log($.cookie('uuid'))
      auth()
    }

    //this is just the click event, not sure where i wanna put it
    $('#login_Register').click(login)

    //this is gonna handle the login once the button is clicked
    function login() {
      info = [$('#userName').val(), $('#password').val()]
      var socket = io.connect('localhost:8089');
      console.log('button clicked')
      socket.emit('signIn', info);
      auth()
      return info;
    }
    //this is going to handle auth for both uuid and username auth, we are gonna see if we have a null info which means it was uuid
    //if its null we are gonna set the info to the uuid, we are gonna get back the auth status true or false, the uuid to make sure its the right person getting it
    //and i cant for the life of me remember why i have a second true coming back after the uuid coming back... oh yea, its to say its uuid XD
    function auth() {
      let socket = io.connect('localhost:8089');
      socket.on('authEmit', function (conInfo) {
        if(info == null){ info = [$.cookie('uuid')]; }
        if ((conInfo[0] === true && info[0] == conInfo[1]) || (conInfo[0] === true && conInfo[2] === true)) {
          console.log(conInfo)
          $('#userName').remove()
          $('#password').remove()
          $('#login_Register').remove()
          if(conInfo[2] != true){ let uuid = create_UUID(); 
          let uuidInfo = [info[0], info[1], uuid]
          console.log(uuidInfo)
          socket.emit('newuuid', uuidInfo);
          }
          socket.emit('getNotes', conInfo[1])
          socket.on('noteSend', loadnotes);
        } else if (conInfo[0] === false && info[0] == conInfo[1]) {
          socket = null;
          $('<p style="color: red;" >Incorrect Username or Password</p>').insertBefore('#userName').delay(10000)
            .fadeOut(100);
        } else {
          socket = null
          console.log('else hit, check send')
        }
      })
    }

    function create_UUID() {
      var dt = new Date().getTime();
      var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (dt + Math.random() * 16) % 16 | 0;
        dt = Math.floor(dt / 16);
        return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });
      $.cookie('uuid', uuid)
      return uuid;
    }

    function loadnotes(notes) {
      //let note = notes[1].rows[0].note
      console.log(notes);
      notes[0].rows.forEach(element => {
          console.log(element);
          $('#main').append(`<p>time: ${element.created} note: ${element.note}`)
      });
      }