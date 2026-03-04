from random import choice, randint
from copy import deepcopy
# randInt
value={'2': -4,'3': -3,'4': -2,'5':-1,'6': 0,'Q': 2,'J': 3,'K': 4,'7': 10,'A': 11}
abs_value={'2': 0,'3': 0,'4': 0,'5': 0,'6': 0,'Q': 2,'J': 3,'K': 4,'7': 10,'A': 11}
def have(number, naipe, hand):
    for i in range(len(hand)):
          if hand[i]['number']==number and hand[i]['naipe']==naipe:
               return True, i
    return False, None

def is_valid(card, hand, played_7, deck_size, trunfo, hand_size=None):
    if hand_size is None:
        hand_size=len(hand)
    if card["naipe"]==trunfo:
            if card["number"]=='7' and deck_size==3 and (hand_size==3 or (have('A', trunfo, hand)[0] and hand_size==2)):  
                return False
            if card["number"]=='A' and not played_7 and hand_size!=1: 
                return False
    return True

def to_object(number, naipe):
    letter=naipe
    if naipe=='♠':
        letter='S'
    elif naipe=='♥':
        letter='H'
    elif naipe=='♦':
        letter='D'
    elif naipe=='♣':
        letter='C'
    return {
        'id': number+letter,
        'number': number,
        'naipe': naipe
    }

def easy_bot(hand, table_deck, trunfo, played_7, deck_size, played_cards):
    card=choice(hand)
    while(not is_valid(card, hand, played_7,deck_size, trunfo)):
         card=choice(hand)
    return card 

def medium_bot(hand, table_deck, trunfo, played_7, deck_size, played_cards):
    hand=deepcopy(hand)
    if hand is None:
        print("erro: mão vazia")
        return
    
    fall_naipe=None if not table_deck else table_deck[0]['naipe'] 
    winner_number=None if not table_deck else table_deck[0]['number']
    im_winning=len(table_deck)==2 
    table_value=0
    for i in range(len(table_deck)):
        card=table_deck[i]
        if (card['naipe']==trunfo and fall_naipe!=trunfo) or (card['naipe']==fall_naipe and value[card['number']]>value[winner_number]):
            fall_naipe=card['naipe']
            winner_number=card['number']
            im_winning=(len(table_deck)-i)%2==0
        table_value+=abs_value[card['number']]

    hand.sort(key=lambda card:(
        card["naipe"]!=trunfo,
        -value[card["number"]])
        )
    
    hand_size=len(hand)
    trunfo_amount=0
    was_in_hand_A=False
    for card in hand:
        if card['naipe']==trunfo:
            trunfo_amount+=1
        else:
            break
    while True:
        if not hand:
            print("erro: nenhuma jogada válida")
            return 
        if(not is_valid(hand[0], hand, played_7, deck_size, trunfo, hand_size)):
            if hand[0]['number']=='A' and hand[0]['naipe']==trunfo:
                was_in_hand_A=True
            del hand[0]
        else:
            break 
        
    have_7,idx_7=have('7',trunfo, table_deck)
    have_A,idx_A=have('A',trunfo, table_deck)
    if have_7 and have_A: 
        if (len(table_deck)-idx_A)%2==0:
            for card in hand:
                if card['naipe']!=trunfo:
                    return card 
            return hand[-1]
        else:
            return hand[-1]

    elif have_7:
        if (len(table_deck)-idx_7)%2==0:
            for card in hand:
                if card['naipe']!=trunfo:
                    return card 
            return hand[-1]
        else:
            if have('A',trunfo, hand)[0]:
                return to_object('A', trunfo)
            for card in reversed(hand): 
                if value[card['number']]<value['7']:
                    return card
            return hand[-1]
    
    if have('2', trunfo, hand)[0] and deck_size>0:
        return to_object('2', trunfo )
    
    if len(table_deck)==0:

        if hand[0]['number']=='7' and hand[0]['naipe']==trunfo:
            if len(hand)==1 or deck_size>=randint(8,16) or was_in_hand_A:
                return hand[0]
            else:
                del hand[0]

        if hand[0]['naipe']==trunfo and hand[-1]['naipe']!=trunfo and value[hand[-1]['number']]>=value['7']:   
            trunfo_counter=0
            for i in range(len(hand)):
                if hand[i]['naipe']==trunfo:
                    trunfo_counter+=1
                else:
                    break
            if trunfo_counter==1 and value[hand[0]['number']]<=value['4']:
                return hand[0] 
            elif trunfo_counter==2 and value[hand[1]['number']]<=value[choice(['Q', '6'])]:
                return hand[1]
            else:
                return hand[-1]
        else:
            return hand[-1] 

    elif len(table_deck)==1:

        if hand[0]['number']=='7' and hand[0]['naipe']==trunfo:
            if len(hand)==1 or deck_size<=randint(8,12):
                return hand[0]
            else:
                del hand[0]

        better_winner_trunfo=None
        better_winner=None
        for card in hand:
            if card['naipe']==trunfo:
                if fall_naipe!=trunfo or value[winner_number]<value[card['number']]:
                    better_winner_trunfo=card
            elif card['naipe']==fall_naipe and fall_naipe!=trunfo:
                if value[winner_number]<value[card['number']]:
                    better_winner=card
        
        if not better_winner and not better_winner_trunfo:
            return hand[-1]
        if better_winner and value[better_winner['number']]<value['7']:
            return better_winner
        
        if better_winner and deck_size>=randint(20,28):
            return better_winner

        if better_winner_trunfo:
            if fall_naipe==trunfo:
                if value[winner_number]>=value['Q']:
                    return better_winner_trunfo
                elif trunfo_amount==2 and value[better_winner_trunfo['number']]-value[winner_number]<=2:
                    return better_winner_trunfo
            else:
                if table_value>=10:
                    return better_winner_trunfo
        if value[hand[-1]['number']]>=value['7'] and better_winner:
            return better_winner
        
        return hand[-1]

    elif len(table_deck)==2:

        if hand[0]['number']=='7' and hand[0]['naipe']==trunfo:
            if len(hand)==1 or deck_size<=randint(8,12):
                return hand[0]
            else:
                del hand[0]

        better_winner_trunfo=None
        better_winner=None
        for card in hand:
            if card['naipe']==trunfo:
                if fall_naipe!=trunfo or value[winner_number]<value[card['number']]:
                    better_winner_trunfo=card
            elif card['naipe']==fall_naipe and fall_naipe!=trunfo:
                if value[winner_number]<value[card['number']]:
                    better_winner=card
        
        if im_winning:
            if table_value>=10:
                if fall_naipe!=trunfo and better_winner_trunfo:
                    return better_winner_trunfo
                if better_winner_trunfo and fall_naipe==trunfo and value[winner_number]<=value['5'] and value[better_winner_trunfo['number']]>=value['Q']:
                    return better_winner_trunfo
                if fall_naipe==trunfo:
                    for card in hand:
                        if card['naipe']!=trunfo and value[card['number']]<value[choice(['7','K','J'])]:
                            return card
                    return hand[-1] 
                return hand[-1]
            else:
                if fall_naipe==trunfo and value[winner_number]>=value[choice(['4','5','6'])]:
                    for card in hand:
                        if card['naipe']!=trunfo:
                            return card
                    return hand[-1]
                else:
                    for card in hand:
                        if card['naipe']!=trunfo and value[card['number']]<value['7']:
                            return card
                    if trunfo_amount==2 and value[hand[1]['number']]<=value[choice(['6','5'])]:
                        return hand[1]
                return hand[-1]
        else:
            if not better_winner and not better_winner_trunfo:
                return hand[-1]
            
            if trunfo != fall_naipe:
                if better_winner:
                    if value[better_winner['number']]<value['7']:
                        return better_winner
                if better_winner_trunfo:
                    if (trunfo_amount>=2 and table_value>=4 and value[better_winner_trunfo['number']]<=value[choice(['6','5'])]) or table_value>=10:
                        return better_winner_trunfo
                    elif value[hand[-1]['number']]<value['7']: 
                        return hand[-1]
                    elif trunfo_amount==2:
                        if value[better_winner_trunfo['number']]<=value[choice(['6', '5'])]:
                            return better_winner_trunfo
                    elif value[better_winner_trunfo['number']]<=value[choice(['4', '3'])]:
                        return better_winner_trunfo
                    elif better_winner:
                        return better_winner
                    else:
                        return hand[-1]   
                else:
                    if value[hand[-1]['number']]<value['7']:
                        return hand[-1]
                    else:
                        return better_winner 
            else:
                if not better_winner_trunfo:
                    return hand[-1]
                if table_value>=10:
                    return better_winner_trunfo 
                if table_value>=4 and trunfo_amount>=2:
                    return better_winner_trunfo
                return hand[-1] 
    else:
        if im_winning:
            for card in hand:
                if card['naipe']!=trunfo:
                    return card
            return hand[-1]
        
        better_winner_trunfo=None
        better_winner=None
        for card in hand:
            if card['naipe']==trunfo:
                if fall_naipe!=trunfo or value[winner_number]<value[card['number']]:
                    better_winner_trunfo=card
            elif card['naipe']==fall_naipe and fall_naipe!=trunfo:
                if value[winner_number]<value[card['number']]:
                    better_winner=card
        
        if better_winner:
            return better_winner
        if better_winner_trunfo:
            if table_value>=10:
                return better_winner_trunfo
            elif trunfo_amount==2 and table_value>=4:
                return better_winner_trunfo
            elif trunfo_amount==3:
                return better_winner_trunfo
            else:
                if value[hand[-1]['number']]>=value['7'] and hand[-1]['naipe']!=trunfo:
                         return better_winner_trunfo
                return hand[-1]
        return hand[-1]

def hard_bot(hand, table_deck, trunfo, played_7, deck_size, played_cards):
    pass