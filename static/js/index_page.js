const {createApp,ref} = Vue;
import {lang} from "./global.js";
const socket=io();

const app=createApp({
setup(){
const tables=ref([]); 
socket.emit('request_tables');
socket.on('change_table', data => {
    tables.value=data.filter(table =>
        table['size']<4 && ! table['game_started']
    );
});
return {tables, lang}
}
});

app.config.compilerOptions.delimiters = ['((', '))'];
app.mount('#app');
