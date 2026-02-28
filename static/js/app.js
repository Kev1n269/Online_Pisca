const {createApp,onMounted,  ref, reactive, component, computed, nextTick} = Vue;

const socket=io("http://localhost:8080")

const getRelativePosition=(currentPlayer, targetPlayer)=>{
    const diff=((currentPlayer-targetPlayer)%4+4)%4; 
    const relativePosition=[
        "bottom", 
        "left",
        "top",
        "right"
    ]
    return relativePosition[diff]
} 

const positionConfig={
    "container":{
    "bottom": "absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3",
    "right": "absolute right-52 top-1/2 -translate-y-1/2 flex flex-col gap-2",
    "top": "absolute top-8 left-1/2 -translate-x-1/2 flex gap-2", 
    "left": "absolute left-48 top-1/2 -translate-y-1/2 flex flex-col gap-2", 
},
"card":{
    "bottom": "w-[84px] h-[124px] pixel-art shadow-2xl rounded cursor-pointer transition-transform duration-100 hover:-translate-y-5",
    "right": "w-[63px] h-[93px] pixel-art shadow-2xl rounded",
    "top": "w-[63px] h-[93px] pixel-art shadow-2xl rounded", 
    "left": "w-[63px] h-[93px] pixel-art shadow-2xl rounded ", 
},
 "card-wrapper": {
    "bottom": "w-[84px] h-[124px]",
    "right": "w-[93px] h-[63px] -rotate-90",
    "top": "w-[63px] h-[93px]", 
    "left": "w-[93px] h-[63px]  rotate-90", 
 },
"discard-stack-card":{
    "bottom": "absolute bottom-[12rem] left-1/2 -translate-x-1/2 -rotate-[5deg]",
    "right": "absolute right-[38%] top-1/2 -translate-y-1/2 -rotate-[86deg]",
    "top": "absolute top-[12rem] left-1/2 -translate-x-1/2 rotate-[4deg]", 
    "left": "absolute left-[38%] top-1/2 -translate-y-1/2 -rotate-[85deg]", 
}, 
"player-stack": { 
    "bottom": "absolute bottom-32 right-[32.5%] -translate-x-1/2",
    "right": "absolute right-64 top-1/4 -translate-y-1/2 -rotate-90",
}
}

const equalate=(vector1, vector2)=>{
for(let i=vector1.length-1; i>=0; i--){ 
    if(!vector2.some(e => e.id===vector1[i].id)){
        vector1.splice(i, 1); 
    }
}
for(const element of vector2){ 
    if(!vector1.some(e=> e.id===element.id)){
        vector1.push(element); 
    }
}
}

const enterPlayerDeck=(card, done)=>{
const deck=document.querySelector('#main-deck'); 
card.style.opacity='0'; 

requestAnimationFrame(()=>{
const deckReact=deck.getBoundingClientRect(); 
const cardReact=card.getBoundingClientRect(); 

card.style.transform=`translate(${deckReact.left-cardReact.left}px, ${deckReact.top-cardReact.top}px) scale(0.75)`;
card.style.opacity='1'; 
card.offsetHeight;

requestAnimationFrame(()=>{

card.style.transition="transform 0.8s ease"; 
card.style.transform="translate(0,0) scale(1)"

setTimeout(done, 800);
}); 
});
};

let lastCardReact=null;
let lastCardIsMine=false;
const leavePlayerDeck=(card, done)=> {
    if (!lastCardIsMine)
        lastCardReact=card.getBoundingClientRect(); 
    lastCardIsMine=false;
    done();
}; 

const enterDiscartStack=(card,done)=>{
    if(!lastCardReact){
        console.log("erro: carta não encontrada"); 
        return; 
    }
card.style.opacity='0'; 

requestAnimationFrame(()=>{
const cardReact=card.getBoundingClientRect();  

card.style.transform=`translate(${lastCardReact.left-cardReact.left}px, ${lastCardReact.top-cardReact.top}px)`;
card.style.opacity='1'; 
card.offsetHeight;

requestAnimationFrame(()=>{

card.style.transition="transform 0.5s ease"; 
card.style.transform=""

setTimeout(()=>{
    done();
    
    card.style.transition="";  
    card.style.transform="";
    card.style.opacity="";     
}, 500);

}); 
});

};

let lastWinner=null; 
let ThisPlayerTeam=null;

const leaveDiscartStack=(card,done)=>{
const stack=document.querySelector(`#player-stack-${lastWinner}`); 
const team=parseInt(card.dataset.team);
requestAnimationFrame(()=>{
 
const stackReact=stack.getBoundingClientRect(); 
const cardReact=card.getBoundingClientRect(); 

const stackDeg=lastWinner===ThisPlayerTeam ? 0 : -90;
let deltaX=(stackReact.left+stackReact.width/2)-(cardReact.left+cardReact.width/2);
let deltaY=(stackReact.top+stackReact.height/2)-(cardReact.top+cardReact.height/2);
if(team===ThisPlayerTeam){
    deltaX-=42;
    deltaY-=2 
}else{
    deltaY-=57;
}

requestAnimationFrame(()=>{
card.style.transition="transform 1.2s ease";
card.style.transform=`translate(${deltaX}px, ${deltaY}px) rotate(${stackDeg}deg) scale(0.75)`;

setTimeout(done, 1200); 
});
});

}

const wait=(ms)=>new Promise(resolve => setTimeout(resolve,ms)); 

let global_card_counter=0; 

let globalActionQueue=[];
let isProcessing=false;

const addInQueue=(actionfn)=>{
    globalActionQueue.push(actionfn); 
    processQueue();
}

const processQueue=async()=>{
    if(isProcessing || globalActionQueue.length===0) return; 
        isProcessing=true;
        const fn=globalActionQueue.shift(); 
        await fn(); 
        isProcessing=false; 
        processQueue(); 
}

const app=createApp({
    setup() {
        const room=ref(1);
        console.log("conectando com o servidor...");
        socket.emit('join_room', {'room': room.value});
        const trunfoCard=ref("");   
        const deckSize=ref(40); 
        const playerDeck=ref([]);
        const ownTeamScore=ref({"regional": 0, "global": 0});
        const opponentTeamScore=ref({"regional": 0, "global": 0});
        const tableDeck=ref([]);
        const currentPlayer=ref(0);
        const id=ref(0);
        const playedCards=ref([0,0]);
        const isHost=ref(false);
        const gameStarded=ref(false);
        const mainDeckSize=computed(()=>Math.max(deckSize.value-1,0)); 
        const endGame=ref(false); 
        const winners=ref([-1,-1]); 
        const isShuffling=ref(false); 
        const playersCardsUid=ref([[],[],[], []]); 

        socket.on('inital-data', data => {
            console.log("conectado na sala", room.value);
            console.log("conectado com id =", data["id"]); 
            id.value=data["id"];
            isHost.value=data["is_host"];
            gameStarded.value=data["game_starded"];
            ThisPlayerTeam=id.value%2; 
        });

        socket.on('to-host', ()=>{
            isHost.value=true;
        });

        socket.on('get-game-state', data=>{
            addInQueue(async()=>{
                ownTeamScore.value["regional"]=data["team_score"][id.value%2];
            opponentTeamScore.value["regional"]=data["team_score"][(id.value+1)%2];
            ownTeamScore.value["global"]=data["global_score"][id.value%2];
            opponentTeamScore.value["global"]=data["global_score"][(id.value+1)%2];
            equalate(playerDeck.value,data["players"][id.value]);
            for(let player=0; player<=3;player++){
                while(data["players"][player].length<playersCardsUid.value[player].length)
                    playersCardsUid.value[player].pop(); 
                while(data["players"][player].length>playersCardsUid.value[player].length)
                    playersCardsUid.value[player].push(global_card_counter++);
            }
            trunfoCard.value=data["trunfo_card"]["id"];
            currentPlayer.value=data["current_player"];
            deckSize.value=data["deck"].length;
            if (deckSize.value==0)
                trunfoCard.value=""; 
            gameStarded.value=true; 
            tableDeck.value=data["table_deck"];
            playedCards.value=data["gained_cards"]; 
            await wait(800); 
            });
        });

        socket.on('play-card', data=>{
            addInQueue(async ()=>{
            ownTeamScore['global']=data['score'][id.value%2]; 
            opponentTeamScore['global']=data['score'][(id.value+1)%2]; 
            if(currentPlayer.value!==id.value)
                playersCardsUid.value[currentPlayer.value].pop();
            tableDeck.value.push({"id": data['card'], "player": currentPlayer.value});
            currentPlayer.value=data['next_player']; 
            await wait(800); 
            });
        });

        socket.on('player-play-card', card=>{
            addInQueue(()=>{
                for(let cardIdx=0; cardIdx<playerDeck.value.length; cardIdx++){
                if(playerDeck.value[cardIdx]['id']===card){
                    playerDeck.value.splice(cardIdx, 1);
                    playersCardsUid.value[id.value].splice(cardIdx, 1); 
                    break;
                }
            }
            });
        });

        socket.on('trade', data=>{
            addInQueue(()=>{
            if (data["player_id"]===id.value){
                for(let cardIdx=0;cardIdx<playerDeck.value.length;cardIdx++){
                    if (playerDeck.value[cardIdx]['id']===data['new_trunfo_card']['id']){
                        playerDeck.value[cardIdx]=data['old_trunfo_card'];
                        break;
                    }
                }
            }
            trunfoCard.value=data['new_trunfo_card']['id'];
            });
        });

        async function collectTableDeck(data){
            ownTeamScore.value["global"]=data["global_score"][id.value%2];
            opponentTeamScore.value["global"]=data["global_score"][(id.value+1)%2];
            if (playedCards.value[0]<data['gained_cards'][0])
                lastWinner=0;
            else 
                lastWinner=1; 
            tableDeck.value=[]; 
            await wait(1200);
            playedCards.value=data["gained_cards"];
            ownTeamScore.value["regional"]=data["team_score"][id.value%2];
            opponentTeamScore.value["regional"]=data["team_score"][(id.value+1)%2];
        }
        async function playersGetCardsFromDeck(data){
            await wait(100); 
            for(let player=0;player<=3;player++){
                 while(data["players"][player].length<playersCardsUid.value[player].length)
                    playersCardsUid.value[player].pop(); 
                while(data["players"][player].length>playersCardsUid.value[player].length)
                    playersCardsUid.value[player].push(global_card_counter++);
            }
            equalate(playerDeck.value,data["players"][id.value]);
            deckSize.value=data['deck'].length;
            nextTick(); 
            if (deckSize.value==0)
                trunfoCard.value=""; 
            await wait(500); 
        }
        socket.on('end-hand', data=>{
            addInQueue(()=>collectTableDeck(data)); 
           addInQueue(()=>playersGetCardsFromDeck(data)); 
        });

        socket.on("end-round", data=>{
            addInQueue(()=>collectTableDeck(data)); 
            addInQueue(()=>{
            console.log("round finalizado!", data['global_score']);
            currentPlayer.value=data['current_player']; 
            socket.emit('end_round', room.value);   
            });
        });

        socket.on('end-game', data=>{
            addInQueue(()=>{
            console.log("Fim de jogo!\nvencedores:", data);
            winners.value=data; 
            endGame.value=true;
            while(tableDeck.value.length>0)
                tableDeck.value.pop(); 
            socket.emit('finish_game', room.value);
            gameStarded.value=false; 
            });
        });
        
        async function shuffle(){
            deckSize.value=40;
            gameStarded.value=true;
            while(tableDeck.value.length>0)
                tableDeck.value.pop(); 
            playedCards.value=[0,0]; 
            await wait(100); 
            isShuffling.value=true; 
            await wait(800); 
            isShuffling.value=false; 
            await wait(900)
            isShuffling.value=true; 
            await wait(800); 
            isShuffling.value=false; 
            await wait(1200);
        }
        socket.on("shuffle", ()=>addInQueue(shuffle));

        const startGame=()=>{
            console.log("iniciando jogo..."); 
            endGame.value=false;
            socket.emit('start_game', room.value);
        }

        const playCard=(cardIdx, el)=>{
            if (currentPlayer.value!=id.value) return;
            lastCardReact=el.getBoundingClientRect(); 
            lastCardIsMine=true; 
            const card=playerDeck.value[cardIdx];
            const data={
                "room": room.value,
                "player_id": id.value,
                "card": card
            };
            socket.emit('play_card', data); 
        }

    return {room, id, trunfoCard, deckSize, playerDeck, ownTeamScore, opponentTeamScore, tableDeck, currentPlayer, playersCardsUid,
            isShuffling, playedCards, isHost, gameStarded, mainDeckSize, endGame, winners, startGame,  playCard}
    }
});

app.component("deck",{
    props:{
        deckSize: {
            type: Number,
            required: true
        }, 
        isShuffling: {
            type: Boolean,
            default: false
        },
        maxVisibleCards: {
            type: Number, 
            default: 8
        }
    },
    setup(props) {
        const visibleCards=computed(()=>Math.min(props.deckSize,props.maxVisibleCards)); 
        const depthGrowthValue=computed(()=>{
          if(visibleCards.value==0) return 0;
          return props.deckSize/visibleCards.value;
        });
        const opacityGrowthValue = computed(()=> visibleCards.value==0 ? 0 : 0.4/visibleCards.value); 
        const basicTranslation=(card)=>(visibleCards.value-card)*0.25*depthGrowthValue.value;
        const cardShuffling=card=>{
            const linear=(card-1)/(visibleCards.value-1);
            const amplitude=10+12*linear; 
            const curve=3*linear*(1-linear);
            const bell=curve*0.8+linear*1.2;  
            const x=Math.sin(card*12.9898)*471289.98312273; 
            const direction=x-Math.floor(x)>=0.5? 1 : -1; 
            const xTranslation= direction*bell**1.11*amplitude;
            const yTranslation = Math.abs(xTranslation)*0.2;  
            const rotation=direction*(3*linear);
            return `translate(${basicTranslation(card)+xTranslation}px, ${basicTranslation(card)+ yTranslation}px) rotate(${rotation}deg)
            `
        }
        return {visibleCards, opacityGrowthValue, depthGrowthValue,basicTranslation, cardShuffling}
    },
    template: `
    <div class="relative w-[63px] h-[93px] perspective-[800px]">
     <img 
      v-for="card in visibleCards"
      :key="card"
      src="/static/assets/cards/CardBack_v12.png"
        class="absolute w-[63px] h-[93px] pixel-art transform-gpu"
        :style="{
        willChange: isShuffling ? 'transform' : 'none',
        transition: 'transform 0.45s ease ' + card*15 + 'ms',
        transform: isShuffling 
        ? cardShuffling(card)
        : 'translate('+ basicTranslation(card) + 'px,' + basicTranslation(card) + 'px)',

        zIndex: card,

        opacity: isShuffling ? 1 : 0.6+card*opacityGrowthValue,
        }"
      />
      </div>
    `
});

app.component("main-deck", {
props: {
    deckSize: {
        type: Number, 
        required: true
    },
    trunfoCard: {
        type: String || undefined, 
        required: true
    },
    isShuffling: {
            type: Boolean,
            required: true,
        }
},
template: `
<div class="absolute left-[30%] top-[23%]">
<div class="relative inline-block"> 
<deck :deck-size="deckSize" :is-shuffling="isShuffling" :max-visible-cards="40"></deck>
<img 
v-if=" trunfoCard!=='' "
:src="'static/assets/cards/'+trunfoCard+'.png'"
class="absolute left-8 -bottom-2 rotate-[80deg] w-[63px] h-[93px] shadow-2xl rounded pixel-art"
</div>
</div>
`
});

app.component("discart-stack",{
props:{
deck: {
type: Array,
required: true
},
playerId: {
    type: Number,
    required: true
}
},
setup(props){
const difStyleArray=computed(()=>{
    let dif=[];
    const positionStyle=positionConfig["discard-stack-card"];
    for(let id=0;id<=3;id++){
        let relativePosition=getRelativePosition(props.playerId, id); 
        dif.push(positionStyle[relativePosition]); 
}
    return dif; 
});
const enter=enterDiscartStack; 
const leave=leaveDiscartStack;
return {difStyleArray, enter, leave};
},
template: `
<transition-group name="table-stack" tag="div" class="relative w-full h-full" @enter="enter" @leave="leave">
<img v-for="(card,index) in deck"
    :key="card['id']"
    :src="'static/assets/cards/'+card['id']+'.png'"
    :class="'w-[84px] h-[124px] pixel-art shadow-2xl rounded ' + difStyleArray[card['player']]"
    :data-team="card['player']%2"
/>
</transition-group>
`
});

app.component("players-deck",{
props: {
    playerId: {
        type: Number, 
        required: true
    }, 
    playersCardsUid: {
        type: Array,
        required: true
    },
    playerDeck: {
        type: Array, 
        required: true
    }
},
setup(props, {emit}){
const difCardStyle=computed(()=>{
    let dif=[];
    const cardStyle=positionConfig["card"];
    for(let id=0;id<=3;id++){
        let relativePosition=getRelativePosition(props.playerId, id); 
        dif.push(cardStyle[relativePosition]); 
}
    return dif; 
});

const difContainerStyle=computed(()=>{
    let dif=[];
    const containerStyle=positionConfig["container"];
    for(let id=0;id<=3;id++){
        let relativePosition=getRelativePosition(props.playerId, id); 
        dif.push(containerStyle[relativePosition]); 
}
    return dif; 
});

const difCardWrapperStyle=computed(()=>{
    let dif=[];
    const containerStyle=positionConfig["card-wrapper"];
    for(let id=0;id<=3;id++){
        let relativePosition=getRelativePosition(props.playerId, id); 
        dif.push(containerStyle[relativePosition]); 
}
    return dif; 
});

const playCard=(card, event)=>{
    const el=event.currentTarget.closest('.inline-block'); 
emit('playCard', card, el);
}
const enter=enterPlayerDeck;
const leave=leavePlayerDeck; 
const ids=[0,1,2,3];
return {difCardStyle,difContainerStyle,difCardWrapperStyle, ids, playCard, enter, leave}
},
template: `
<div class="w-full h-full">
<div v-for="id in ids" :key="id">
<transition-group
tag="div"
name="player-hand"
@enter="enter"
@leave="leave"
:class="difContainerStyle[id]"
>
<div v-for="(uid,index) in playersCardsUid[id]" :key="uid" class="inline-block">
<div :class="difCardWrapperStyle[id]">
<img 
:src="'static/assets/cards/' + (id===playerId ? playerDeck[index]['id'] : 'CardBack_v12') +'.png'"
:class="difCardStyle[id]"
@click="id===playerId ? playCard(index, $event) : null"
/>
</div>
</div>
</transition-group>
</div>
</div>
`
});

app.component("scoreboard",{
props: {
ownTeamScore: {
type: Number, 
required: true 
},
opponentTeamScore: {
type: Number, 
required: true 
}
},
template: `
<div class="h-full w-full"> 
    <div class="fixed top-8 left-36 border-4 border-double bg-stone-900 border-orange-500 bg-gr-500 rounded-lg p-3 text-base shadow-lg  w-40 flex-col">
        <p class="text-emerald-400 font-bold">Seu time: ((ownTeamScore))</p>
        <hr class="border-t-2 border-yellow-700 my-2"/>
        <p class="text-red-400 font-bold">Adversários: ((opponentTeamScore))</p>
    </div>
</div>
`
});

app.component("players-stack", {
props: {
    playerId: {
        type: Number,
        required: true
    },
playedCards: {
    type: Array, 
    required: true
},
ownTeamScore: {
    type: Number,
    required: true 
},
opponentTeamScore: {
    type: Number,
    required: true 
}
}, 
setup(props){
    const playerTeam=props.playerId%2;
const difStyleArray=computed(()=>{
let dif=[];
    const stackStyle=positionConfig["player-stack"];
    for(let team=0; team<=1; team++){
        let relativePosition=team==playerTeam ? "bottom" : "right"; 
        dif.push(stackStyle[relativePosition]); 
}
    return dif; 
});
const score=computed(()=>{
return [
    playerTeam==0 ? props.ownTeamScore : props.opponentTeamScore,
    playerTeam==1 ? props.ownTeamScore : props.opponentTeamScore,
]
});
return {difStyleArray,score}
},
template: `
<div class="h-full w-full">
<div 
v-for="(deckSize,index) in playedCards"
:key="index"
:class="difStyleArray[index]"
>
<div class="relative inline-block">
<deck :deck-size="deckSize" :id="'player-stack-'+index"></deck>
<p v-if="deckSize!==0" class="absolute left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 bg-black/15  text-white tracking-tight text-base drop-shadow-[0_3px_0px_rgba(0,0,0,1)] font-bold">
((score[index]))
</p>
</div>
</div>
</div>
`
}); 

app.config.compilerOptions.delimiters = ['((', '))']
app.mount('#app');

