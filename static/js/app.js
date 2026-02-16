const {createApp, ref, component, computed} = Vue;

const socket=io("http://localhost:8080")

const getRelativePosition=(currentPlayer, targetPlayer)=>{
    const diff=((currentPlayer-targetPlayer)%4+4)%4; 
    const relativePosition=[
        "bottom", 
        "right",
        'top',
        'left'
    ]
    return relativePosition[diff]
} 

const positionConfig={
    "container":{
    "bottom": "absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3",
    "right": "absolute right-12 top-1/2 -translate-y-1/2 flex gap-2 -rotate-90",
    "top": "absolute top-8 left-1/2 -translate-x-1/2 flex gap-2", 
    "left": "absolute left-12 top-1/2 -translate-y-1/2 flex gap-2 rotate-90", 
},
"card":{
    "bottom": "w-[84px] h-[124px] pixel-art shadow-2xl rounded",
    "right": "w-[63px] h-[93px] pixel-art shadow-2xl rounded",
    "top": "w-[63px] h-[93px] pixel-art shadow-2xl rounded", 
    "left": "w-[63px] h-[93px] pixel-art shadow-2xl rounded", 
},
"discard-stack-card":{
    "bottom": "absolute bottom-[12rem] left-1/2 -translate-x-1/2 -rotate-[5deg]",
    "right": "absolute right-[38%] top-1/2 -translate-y-1/2 rotate-[80deg]",
    "top": "absolute top-[12rem] left-1/2 -translate-x-1/2 rotate-[12deg]", 
    "left": "absolute left-[38%] top-1/2 -translate-y-1/2 rotate-[85deg]", 
}
}

const app=createApp({
    delimiters: ['[[', ']]'],
    setup() {
        const room=ref(1);
        console.log("conectando com o servidor...")
        socket.emit('join_room', {'room': room.value});
        const playersDeckSize=ref([0,0,0,0]);
        const trunfoCard=ref({});
        const deckSize=ref(40);
        const playerDeck=ref([])
        const ownTeamScore=ref({"regional": 0, "global": 0})
        const opponentTeamScore=ref({"regional": 0, "global": 0})
        const tableDeck=ref([])
        const currentPlayer=ref(0)
        const id=ref(0);
        const ownTeamId=computed(()=>id.value%2);
        const opponentTeamId=computed(()=>(id.value+1)%2);
        socket.on('player-id', data => {console.log("conectado com id =", data); id.value=data});
        socket.on('get-game-state', data=>{
            playerDeck.value=data["players"][id.value];
            for(let iterador=0;iterador<data["players"].length; iterador++){
                playersDeckSize.value[iterador]=data["players"][iterador].length; 
            }
            trunfoCard.value=data["trunfo_card"]["id"];
            currentPlayer.value=data["current_player"];
            tableDeck.value=data["table_deck"];
            ownTeamScore.value["regional"]=data["team_score"][ownTeamId];
            ownTeamScore.value["global"]=data["global_score"][ownTeamId];
            opponentTeamScore.value["regional"]=data["team_score"][opponentTeamId];
            opponentTeamScore.value["global"]=data["global_score"][opponentTeamId];
            /*deckSize.value=data["deck"].length;*/ 
        });

        
        function startGame(){

        }
        function diminuiDeckSize(){
            deckSize.value--;
            console.log(deckSize.value);
        }

        return {room, id, trunfoCard,deckSize,playerDeck,ownTeamScore,opponentTeamScore,tableDeck,currentPlayer,ownTeamId, playersDeckSize, startGame, diminuiDeckSize}
    }
});

app.component('deck',{
    props:{
        deckSize: {
            type: Number,
            required: true
        }
    },
    setup(props) {
        const deckSize=computed(()=>Math.max(props.deckSize-1,0));
        const visibleCards=computed(()=>Math.min(deckSize.value,8)); 
        const depthGrowthValue=computed(()=>{
          if(visibleCards.value==0) return 0;
          return deckSize.value/visibleCards.value;
        });
        const opacityGrowthValue = computed(()=> visibleCards.value==0 ? 0 : 0.6/visibleCards.value); 
        return {visibleCards, opacityGrowthValue, depthGrowthValue}
    },
    template: `
    <div class="relative w-[63px] h-[93px]">
     <img 
      v-for="card in visibleCards"
      :key="card"
      src="/static/assets/cards/CardBack_v12.png"
        class="absolute w-[63px] h-[93px] pixel-art"
        :style="{
        transform: 'translate('+ ((visibleCards-card)*0.25*depthGrowthValue) + 'px,' + ((visibleCards-card)*0.25*depthGrowthValue) + 'px)',
        zIndex: card,
        opacity: 0.4+card*opacityGrowthValue,
        }"
      />
      </div>
    `
});

app.component('discart-stack',{
props:{
tableDeck: {
type: Array,
required: true
},
playerId: {
    type: Number,
    required: true
}
},
setup(props){
console.log("pilha de discarte criada com sucesso");
const deck=computed(()=>props.tableDeck); 
const difStyleArray=computed(()=>{
    let dif=[];
    const positionStyle=positionConfig["discard-stack-card"];
    for(let id=0;id<=3;id++){
        let relativePosition=getRelativePosition(props.playerId, id); 
        dif.push(positionStyle[relativePosition]); 
}
    return dif; 
});
return {deck, difStyleArray};
},
template: `
<div class="w-full h-full">
<img v-for="(card,index) in deck"
    :key="index"
    :src="'static/assets/cards/'+card.id+'.png'"
    :class="'w-[84px] h-[124px] pixel-art shadow-2xl rounded ' + difStyleArray[card['player']]"
/>
</div>
`
});

app.component("players-deck",{
props: {
    playerId: {
        type: Number, 
        required: true
    }, 
    playersDeckSize: {
        type: Array,
        required: true
    },
    playerDeck: {
        type: Array, 
        required: true
    }
},
setup(props){
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

const playersDeck=computed(()=>{
  const deck=[[],[],[],[]]; 
  for (let id=0; id<=3;id++){
    if(id===props.playerId){
    for (const card of props.playerDeck){
        deck[id].push("static/assets/cards/"+card["id"]+".png");
    }
    }else{
        for(let card=1;card<=props.playersDeckSize[id]; card++){
            deck[id].push("static/assets/cards/CardBack_v12.png");
        }
    }
  }
  return deck;
}); 

const ids=[0,1,2,3];
return {difCardStyle,difContainerStyle,playersDeck, ids}
},
template: `
<div class="w-full h-full">
<div
v-for="id in ids"
:key="id"
:class="difContainerStyle[id]"
>
<img 
v-for="(card,index) in playersDeck[id]"
:key="index"
:src="card"
:class="difCardStyle[id]"
/>
</div>
</div>
`
});

app.mount('#app');

