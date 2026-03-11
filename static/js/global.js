const basicUrl="/static/assets/flags/";

const naipes=["S", "H", "C", "D"];
const numbers=['2','3','4','5','6','Q','J','K','7','A'];
let all_cards=["CardBack_v12"]; 
for(const naipe of naipes)
    for(const number of numbers)
        all_cards.push(number+naipe);

all_cards.forEach(card=>{
const img=new Image();
img.src=`/static/assets/cards/${card}.png`;
});

export const lang=Vue.ref(localStorage.getItem("lang") || "en"); 

const updateFlag=()=>{
    const flag=document.querySelector("#flag");
    if(!flag) return;
    flag.src=basicUrl+`${lang.value=="en" ? "pt" : "en"}.svg`; 
}

updateFlag(); 

const toggleLang= ()=>{
    const newLang=lang.value=="en" ? "pt" : "en"; 
    lang.value=newLang; 
    updateFlag();
    localStorage.setItem("lang", newLang); 
    
}

window.toggleLang=toggleLang; 