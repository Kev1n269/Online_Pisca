const {createApp,onMounted,  ref, reactive, component, computed, nextTick} = Vue;

const socket=io()

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
"change-bot-container":{
    "right": "absolute right-96 top-1/2 -translate-y-1/2 ",
    "top": "absolute top-36 left-1/2 -translate-x-1/2", 
    "left": "absolute left-72 top-1/2 -translate-y-1/2", 
},
"change-bot-container-finished-game":{
    "right": "absolute right-48 top-1/2 -translate-y-1/2 ",
    "top": "absolute top-20 left-1/2 -translate-x-1/2", 
    "left": "absolute left-40 top-1/2 -translate-y-1/2", 
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

const waitImage=(card, cb)=>{
const img=card.querySelector('img') || card;
if(!img) return; 
if(img.complete)
    cb();
else
    img.addEventListener('load', cb, {once: true});
}

const enterPlayerDeck=(card, done)=>{
    waitImage(card, async ()=>{    
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
waitImage(card, ()=>{
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
const timeAng=ThisPlayerTeam===0 ? 0 : -90;
const opponentAng=ThisPlayerTeam===0 ? -90 : 0; 
const stackDeg=lastWinner===ThisPlayerTeam ? timeAng : opponentAng;
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

const wait=(ms)=>new Promise(resolve => {
    if(document.hidden) {resolve(); return;}
    setTimeout(resolve,ms);
}); 

let global_card_counter=0; 

let globalActionQueue=[];
let isProcessing=false;
let queueCounter=0;
const addInQueue=(actionfn)=>{
    queueCounter++;
    globalActionQueue.push([actionfn, queueCounter]); 
    processQueue();
}

const processQueue=async()=>{
    if(isProcessing || globalActionQueue.length===0) return; 
        isProcessing=true;
        const [fn, id]=globalActionQueue.shift(); 
        console.log(`executando função de id ${id}`); 
        try{
        await fn();
    }catch(e){
        console.log(`erro na fila de ${id}:`, e); 
    }finally{ 
        isProcessing=false; 
        await processQueue(); 
}
}

const app=createApp({
    setup() {
        const lang=ref("en"); 
        const appDiv=document.getElementById('app');
        const room=ref(parseInt(appDiv.dataset.room));
        console.log("conectando com o servidor...");
        socket.emit('join_room', {'room': room.value});
        const isFinishedOnce=ref(false);
        const trunfoCard=ref("");   
        const playersType=reactive([],[],[],[]); 
        const deckSize=ref(40); 
        const playerDeck=reactive([]);
        const ownTeamScore=ref({"regional": 0, "global": 0});
        const opponentTeamScore=ref({"regional": 0, "global": 0});
        const tableDeck=reactive([]);
        const currentPlayer=ref(0);
        const id=ref(0);
        const playedCards=reactive([0,0]);
        const isHost=ref(false);
        const gameStarded=ref(false);
        const mainDeckSize=computed(()=>Math.max(deckSize.value-1,0)); 
        const endGame=ref(false); 
        const winnerText=ref(""); 
        const winners=reactive([-1,-1]); 
        const isShuffling=ref(false); 
        const playersCardsUid=reactive([[],[],[], []]); 

        socket.on('inital-data', data => {
            console.log("conectado na sala", room.value);
            console.log("conectado com id =", data["id"]); 
            id.value=data["id"];
            isHost.value=data["is_host"];
            gameStarded.value=data["game_starded"];
            ThisPlayerTeam=id.value%2; 
        });
        
        socket.on('get-initial-player-type', data=>playersType.value=data);
        socket.on('new-player', data=>playersType.value[data]="player"); 
        socket.on('to-bot', data=>playersType.value[data]="medium_bot"); 

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
            ownTeamScore.value['global']=data['score'][id.value%2]; 
            opponentTeamScore.value['global']=data['score'][(id.value+1)%2]; 
            if(currentPlayer.value!==id.value)
                playersCardsUid.value[currentPlayer.value].pop();
            tableDeck.value.push({"id": data['card'], "player": currentPlayer.value});
            currentPlayer.value=data['next_player']; 
            await wait(1000); 
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
            addInQueue(async ()=>{
            if (data["player_id"]===id.value){
                for(let cardIdx=0;cardIdx<playerDeck.value.length;cardIdx++){
                    if (playerDeck.value[cardIdx]['id']===data['new_trunfo_card']['id']){
                        playerDeck.value[cardIdx]=data['old_trunfo_card'];
                        break;
                    }
                }
            }
            trunfoCard.value=data['new_trunfo_card']['id'];
            await wait(800); 
            });
        });

        async function collectTableDeck(data){
            ownTeamScore.value["global"]=data["global_score"][id.value%2];
            opponentTeamScore.value["global"]=data["global_score"][(id.value+1)%2];
            lastWinner=data['last_winner']; 
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
            addInQueue(async()=>wait(300));
            addInQueue(()=>{
            console.log("round finalizado!", data['global_score']);
            currentPlayer.value=data['current_player']; 
            socket.emit('end_round', room.value);   
            });
        });

        socket.on('end-game', data=>{
            addInQueue(()=>collectTableDeck(data)); 
            addInQueue(()=>{
            console.log("Fim de jogo!\nvencedores:", data);
            isFinishedOnce.value=true; 
            playedCards.value=[0,0];
            deckSize.value=40; 
            endGame.value=true;
            winners.value=data['winners']; 
            if(winners.value[0]===id.value%2)
                winnerText.value="Congratulations! You won!";
            else
                winnerText.value="You lost! Better luck next time!";
            while(tableDeck.value.length>0)
                tableDeck.value.pop(); 
            socket.emit('finish_game', room.value);
            gameStarded.value=false; 
            });
        });
        
        let illegalPlayRunning=false; 
        socket.on('illegal-play', cardId=>{
            if(illegalPlayRunning) return; 
            let cardIndex=-1;
            for(let i=0;i<playerDeck.value.length; i++){ 
                if(playerDeck.value[i]['id']==cardId){
                    cardIndex=i; 
                    break;
                }
            }
            if(cardIndex==-1){
                console.log("erro: carta não encontrada no lance ilegal");
                return;  
            }
            addInQueue(()=>{
                illegalPlayRunning=true; 
            const card=document.querySelector("#player-hand-"+id.value+"-"+cardIndex);
            return new Promise(done =>{
                if(!card){
                console.log('carta não existe no DOM');  
                done();
            }
            card.classList.add('shake-animation');    
            card.addEventListener("animationend",()=>{
                card.classList.remove('shake-animation');
                illegalPlayRunning=false;
                done()
            }, {once: true});
            });
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
            addInQueue(()=>{
            console.log("iniciando jogo..."); 
            endGame.value=false;
            winnerText.value=""; 
            socket.emit('start_game', room.value);
            });
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

        const changeBot=(idx, bot)=>{ 
            playersType.value[idx]=bot;
            socket.emit('change_bot', room.value, idx, bot);
        }

    document.addEventListener('visibilitychange', ()=>{
        if (document.visibilityState === 'visible' && gameStarded.value){
            globalActionQueue=[];
            isProcessing=false
            socket.emit('request_state', room.value); 
        }
        });

    return {room, id, trunfoCard, deckSize, playerDeck, ownTeamScore, opponentTeamScore, tableDeck, currentPlayer, playersCardsUid,changeBot, lang,
isShuffling, playedCards, isHost, gameStarded, mainDeckSize, endGame, winners, winnerText, playersType, isFinishedOnce, startGame,  playCard}
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
:src="'/static/assets/cards/'+trunfoCard+'.png'"
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
    :src="'/static/assets/cards/'+card['id']+'.png'"
    :alt="card['id']"
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
<div v-for="(uid,index) in playersCardsUid[id]" :key="id===playerId ? playerDeck[index]['id'] : uid" class="inline-block" :id="'player-hand-'+id+'-'+index">
<div :class="difCardWrapperStyle[id]">
<img 
:src="'/static/assets/cards/' + (id===playerId ? playerDeck[index]['id'] : 'CardBack_v12') +'.png'"
:alt="id==playerId ? playerDeck[index]['id'] : 'card_img' "
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

app.component("change-bot", {
   props: {
    playerId: {
        type: Number, 
        required: true
    }, 
    playersType: {
        type: Array, 
        required: true 
    },
    isFinishedOnce: {
        type: Boolean,
        required: true
    }, 
    lang: {
        type: String, 
        default: "en"
    }
},
setup(props, {emit}){
const difContainerStyle=computed(()=>{
    let dif=[];
    const containerStyle=props.isFinishedOnce ?positionConfig['change-bot-container-finished-game'] : positionConfig["change-bot-container"];
    for(let id=0;id<=3;id++){
        let relativePosition=getRelativePosition(props.playerId, id); 
        dif.push(containerStyle[relativePosition]); 
}
    return dif; 
});

const ids=[0,1,2,3];
const showMenu=ref([false,false,false,false]); 

const to_text=(text)=>{

    if(props.lang==="en"){
if(text==="easy_bot") return "Easy";
else if(text==="medium_bot") return "Medium";
else if(text==="hard_bot") return "Hard";
else return text;
    }

    else{
if(text==="easy_bot") return "Fácil";
else if(text==="medium_bot") return "Médio";
else if(text==="hard_bot") return "Difícil";
else return text;   
    }

}

const levels=["easy_bot", "medium_bot", "hard_bot"]
const selectBot=(id, bot)=>{
emit('changeBot', id, bot);
}
const menuCloseTimer=[null,null,null,null];
const startCloserTimer=(id)=>{
menuCloseTimer[id]=setTimeout(()=>{
showMenu.value[id]=false; 
},200);
}
const cancelCloserTimer=(id)=>{
clearTimeout(menuCloseTimer[id]); 
}
return {difContainerStyle, ids, showMenu, levels, to_text, selectBot, startCloserTimer, cancelCloserTimer}
},
template: `
<div class="w-full h-full">
<div v-for="id in ids" :key="id">

<div v-if="playersType[id]!=='player'" @mouseenter="cancelCloserTimer(id)" @mouseleave="startCloserTimer(id)" :class="difContainerStyle[id] + ' z-50' ">
<button @click="showMenu[id]=!showMenu[id]" class="px-3 py-1 text-base text-amber-200 font-semibold bg-green-800 border-2 border-amber-400/60 rounded-full shadow-md hover:bg-green-700 hover:border-amber-400/90 ring-1 ring-amber-200/40 transition-all duration-150 cursor-pointer">
(( playersType[id] == 'player' ? '' : 'Bot with level ' + to_text(playersType[id]) ))
</button>

<div v-show="showMenu[id]" @mouseenter="cancelCloserTimer(id)" @mouseleave="startCloserTimer(id)" class="absolute translate-x-4 translate-y-2 flex flex-col gap-1 p-2 w-24 bg-green-900/90 border border-double border-amber-400/30 rounded-lg shadow-xl ring-1 ring-amber-300/50 transition-all duration-300 cursor-pointer"> 
<button v-for="level in levels" :key="level" @click="selectBot(id,level)" :class="[
'w-full px-2 py-1 text-sm rounded transition-colors duration-150 cursor-pointer',
level===playersType[id] 
? 'text-amber-400 font-bold hover:bg-green-700/60' 
: 'text-amber-100 hover:bg-green-700/60'
]">
(( to_text(level) ))
</button>
</div>

</div>
</div>
</div>
`
});

app.config.compilerOptions.delimiters = ['((', '))'];
app.mount('#app');

