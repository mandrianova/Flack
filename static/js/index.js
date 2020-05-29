document.addEventListener('DOMContentLoaded', () => {
    // Global variables
    let user_name = localStorage.getItem('username');
    let g_chat_type;
    let g_chat;

    function get_height() {
        document.querySelector('#chat_window').style.height = window.innerHeight - 270 + "px";
        document.querySelector('#chats_list').style.height = window.innerHeight - 80 + "px";
    }
    get_height();
    window.addEventListener("resize", get_height);
    // Function for locking button if input is empty
    function lock_button(selector_input, selector_button) {
        if (document.querySelector(selector_input).value.length > 0)
        {
            document.querySelector(selector_button).disabled = false;
        }
        else
        {
            document.querySelector(selector_button).disabled = true;
        }
    }

    // Function for change current username
    function update_username() {
        user_name = localStorage.getItem('username');
        document.querySelector('#name').removeAttribute('hidden');
        document.querySelector('#login').setAttribute('hidden', true);
        document.querySelector('#p_name').innerHTML = user_name;
    }

    // Function for getting message for chat
    function open_chat(chat, chat_type) {
        document.querySelector('#chat_window').removeAttribute('hidden');
        document.querySelector('#chat_name').innerHTML = chat;
        document.querySelector('#messages').innerHTML = "";
        const request = new XMLHttpRequest();
            request.open('GET', `/api/chat/${chat}?chat_type=${chat_type}&user_name=${user_name}`);
            request.onload = () => {
                const resp = JSON.parse(request.responseText);
                if (!resp.success) {
                    document.querySelector('.alert').removeAttribute('hidden');
                    document.querySelector('#error').innerHTML = resp.error;
                }
                else {
                    document.querySelector('#messages').innerHTML = "";
                    if (resp.messages.length === 0)
                    {
                        document.querySelector('#messages').innerHTML = "No messages";
                    }
                    else
                    {
                        for (let i = 0; i < resp.messages.length; i++)
                        {
                            const message = document.createElement('div');
                            const user = document.createElement('h6');
                            const date = document.createElement('small');
                            const text = document.createElement('div');
                            user.innerHTML = resp.messages[i]['user'];
                            date.innerHTML = moment(resp.messages[i]['date']).fromNow();
                            text.innerHTML = resp.messages[i]['message'];
                            if (user_name !== resp.messages[i]['user'])
                            {
                                message.append(user);
                                message.className = 'message_body';
                            }
                            else {
                                message.className = 'message_body from_me';
                                const del = document.createElement('span');
                                del.className = "delete_message material-icons message-icon";
                                del.innerHTML = 'delete';
                                del.setAttribute('data-id', `${i}`);
                                message.append(del);
                            }
                            message.append(text);
                            message.append(date);
                            if (i === resp.messages.length - 1)
                            {
                                message.setAttribute('id', 'new_message');
                            }
                            document.querySelector('#messages').append(message);
                        }
                        document.querySelectorAll('.delete_message').forEach(span => {
                            span.onclick = () => {
                                let message_id = span.getAttribute('data-id');
                                socket.emit('delete_message', {'chat': g_chat, 'chat_type': g_chat_type, 'id': message_id, 'user_name': user_name});
                                open_chat(g_chat, g_chat_type);
                            };
                        });
                    }
                }
                document.title = chat;
                history.pushState({'title': chat, 'text': resp}, chat, `/chat/${chat_type}/${chat}`);
            };
            g_chat_type = chat_type;
            g_chat = chat;
            activate_chat();
            request.send();
    }

    // Check current url
    let path = window.location.pathname

    // If chat open get chat content
    if (path.includes("chat")) {
        let chat_type = path.split("/")[2];
        let chat_name = path.split("/")[3];
        g_chat_type = chat_type;
        g_chat = chat_name;
        open_chat(chat_name, chat_type);
    }
    document.querySelector('.navbar-brand').onclick = () => {
        document.title = 'Flack';
        history.pushState({'title': 'Flack'}, 'Flack', `/`);
        return false;
    };


    // By default, submit button is disabled
    document.querySelector('#join').disabled = true;
    document.querySelector('#add_channel').disabled = true;
    document.querySelector('#send').disabled = true;
    document.querySelector('#username').onkeyup = function () { lock_button('#username', '#join'); };
    document.querySelector('#channel').onkeyup = function () { lock_button('#channel', '#add_channel'); };
    document.querySelector('#message').onkeyup = function () { lock_button('#message', '#send'); };

    document.querySelector('body').onclick = () => {
        document.querySelector('.alert').setAttribute('hidden', true);
    };

    // Check username in LocalStorage
    if (localStorage.getItem('username')) {
        update_username();
        document.querySelector('#logout').onclick = function () {
            localStorage.clear();
            user_name = null;
            document.querySelector('#name').setAttribute('hidden', true);
            document.querySelector('#login').removeAttribute('hidden');
        };
    }
    else {
        document.querySelector('#name').setAttribute('hidden', true);
        document.querySelector('#login').removeAttribute('hidden');
    }

    // Connect to websocket
    const socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

    // When connected, configure buttons
    socket.on('connect', () => {

        // function for add users and channels
        function add_name (selector_input, selector_button, type_name){
            const name = document.querySelector(selector_input).value;
            const request = new XMLHttpRequest();
            request.open('POST', `/has/${type_name}`);
            request.onload = () => {
                const resp = JSON.parse(request.responseText);
                if (resp.name) {
                    document.querySelector('.alert').removeAttribute('hidden');
                    document.querySelector('#error').innerHTML = "This name is busy!";
                }
                else {
                    socket.emit('join', {'type_name': type_name, 'name': name});
                    document.querySelector('.alert').removeAttribute('hidden');
                    document.querySelector('#error').innerHTML = "Success!";
                    if (type_name === 'users'){
                        localStorage.setItem('username', name);
                        update_username();
                    }
                }
            };
            const names = new FormData();
            names.append('name', name);
            request.send(names);
            document.querySelector(selector_input).value = '';
            document.querySelector(selector_button).disabled = true;
        }

        // User join
        document.querySelector('#join').onclick = function () {add_name('#username', '#join', 'users'); };

        // Add channel
        document.querySelector('#add_channel').onclick = function () { add_name('#channel', '#add_channel', 'channels'); };

        // Send message
        document.querySelector('#send').onclick = () => {
            const text = document.querySelector('#message').value;
            const chat_type = g_chat_type;
            const chat = g_chat;
            socket.emit('send', {'chat_type': chat_type, 'user_name': user_name, 'chat': chat, 'message': text, 'date': moment.utc()});
            open_chat(chat, chat_type);
            document.querySelector('#message').value = '';
            document.querySelector('#send').disabled = true;
        };
    });

    // Add new channels and new users
    socket.on('joined', data => {
        document.querySelector('.users').innerHTML= '';
        for (let i = 0; i < data.users.length; i++)
        {
            const p = document.createElement('p');
            p.className = "user_link";
            p.innerHTML = data.users[i];
            document.querySelector('.users').append(p);

        }
        document.querySelector('.channels').innerHTML= '';
        for (let i = 0; i < data.channels.length; i++)
        {
            const p = document.createElement('p');
            p.className = "channel_link";
            p.innerHTML = data.channels[i];
            document.querySelector('.channels').append(p);
        }
        get_links();
        activate_chat();
    });
    socket.on('chat', data => {
       if (data.chat === g_chat && g_chat_type === 'channel') {
           open_chat(g_chat, g_chat_type);
       }
       if (g_chat_type === 'to_user' && (data.chat === `${user_name}_${g_chat}` || data.chat === `${g_chat}_${user_name}`)) {
           open_chat(g_chat, g_chat_type);
       }
    });
    socket.on('error', data => {
       document.querySelector('#error').innerHTML = data.error;
    });
    function get_links() {
        document.querySelectorAll('.channel_link').forEach(link => {
           link.onclick = () => {
               const chat = link.innerHTML;
               link.style.animationPlayState = 'running';
               open_chat(chat, 'channel');
               return false;
           };
        });
        document.querySelectorAll('.user_link').forEach(link => {
           link.onclick = () => {
               const chat = link.innerHTML;
               open_chat(chat, 'to_user');
               return false;
           };
        });
    }
    function activate_chat() {
        if (g_chat_type === 'channel')
        {
            document.querySelectorAll('.channel_link').forEach(p => {
                if (p.innerHTML === g_chat)
                    p.setAttribute('id', 'active_chat');
                else
                    p.removeAttribute('id');
            });
            document.querySelectorAll('.user_link').forEach(p_u => {
                p_u.removeAttribute('id');
            });
        }
        else
        {
            document.querySelectorAll('.user_link').forEach(p => {
                if (p.innerHTML === g_chat)
                    p.setAttribute('id', 'active_chat');
                else
                    p.removeAttribute('id');
            });
            document.querySelectorAll('.channel_link').forEach(p_c => {
                p_c.removeAttribute('id');
            });
        }
    }
    function key_enter(input_name, button_name) {
        let input = document.querySelector(input_name);
        input.addEventListener("keyup", function (event) {
            if (event.keyCode === 13) {
                event.preventDefault();
                document.querySelector(button_name).click();
            }
        });
    }
    key_enter('#message','#send');
    key_enter('#channel','#add_channel');
    key_enter('#username','#join');
    activate_chat();
    get_links();

});

