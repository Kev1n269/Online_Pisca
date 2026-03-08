from random import choice, randint
from copy import deepcopy
from python.bisca_logic import naipe_to_character, inital_deck as all_cards
import math

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
            if card["number"]=='7' and deck_size==3 and (hand_size==3 or (not have('A', trunfo, hand)[0] and hand_size==2)):  
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

def easy_bot(hand, table_deck, trunfo, played_7, deck_size, played_cards,
             team_score, global_score,
            my_team, trunfo_card):
    valid_cards=[c for c in hand if is_valid(c, hand, played_7,len(table_deck), trunfo)]
    if not valid_cards:
        raise ValueError("nenhuma carta válida")
    
    return choice(valid_cards) 

def medium_bot(hand, table_deck, trunfo, played_7, deck_size, played_cards,
             team_score, global_score,
            my_team, trunfo_card):
    hand=deepcopy(hand)
    if not hand:
        raise ValueError("erro: mão vazia")
    
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
    original_hand=hand[:]
    trunfo_amount=0
    was_in_hand_A=False
    for card in hand:
        if card['naipe']==trunfo:
            trunfo_amount+=1
        else:
            break
    while True:
        if not hand:
            raise ValueError("erro: nenhuma jogada válida") 
        if(not is_valid(hand[0], original_hand, played_7, len(table_deck), trunfo, hand_size)):
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
    
    if len(hand) == 1:
        return hand[0] 

    if len(table_deck)==0:

        if hand[0]['number']=='7' and hand[0]['naipe']==trunfo:
            if len(hand)==1 or deck_size>=randint(8,16) or was_in_hand_A:
                return hand[0]
            else:
                del hand[0]
        
        if len(hand) == 1:
            return hand[0] 

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

        if len(hand) == 1:
            return hand[0] 

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
        
        if len(hand) == 1:
            return hand[0] 

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
                        if value[better_winner_trunfo['number']]<=value[choice  (['6', '5'])]:
                            return better_winner_trunfo
                    elif value[better_winner_trunfo['number']]<=value[choice(['4', '3'])]:
                        return better_winner_trunfo
                    elif better_winner:
                        return better_winner
                    else:
                        return hand[-1]   
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

def beats(card, target, trunfo, ignore_naipe=False):
    if card['naipe'] == trunfo and target['naipe'] != trunfo:
        return True
    elif ignore_naipe or card['naipe']==target['naipe']:
        return value[card['number']]>value[target['number']]
    return False

OPPONENTS_AFTER = {0: 2, 1: 1, 2: 1, 3: 0}
PARTNERS_AFTER  = {0: 1, 1: 1, 2: 0, 3: 0}

def evaluate(card, hand, table_deck, trunfo, played_7, deck_size, remaining_cards,
             team_score, global_score, my_team):
    if not is_valid(card, hand, played_7, len(table_deck), trunfo):
        return -2e9
    if card['naipe'] == trunfo and card['number'] == '7':
        return -1e8

    opponent_team = (my_team + 1) % 2
    position      = len(table_deck)
    CV = abs_value[card['number']]
    TV = sum(abs_value[c['number']] for c in table_deck)

    winner_card = None
    winner_team = None
    for c in table_deck:
        if winner_card is None or beats(c, winner_card, trunfo):
            winner_card = c
            winner_team = c['player'] % 2  # player 0,2 → team 0 | player 1,3 → team 1

    partner_winning  = (winner_team == my_team)      if winner_card else False
    my_card_takes    = (winner_card is None) or beats(card, winner_card, trunfo)

    total_remaining  = len(remaining_cards)
    cards_in_hands   = max(0, total_remaining - deck_size)
    cards_per_player = cards_in_hands / 3 if total_remaining > 0 else 0

    opponents_after = OPPONENTS_AFTER[position]
    partners_after  = PARTNERS_AFTER[position]

    my_beaters = [c for c in remaining_cards if beats(c, card, trunfo)]
    winner_beaters = [c for c in remaining_cards
                      if winner_card and beats(c, winner_card, trunfo)]

    def p_someone_has(card_list, n_players):
        if not card_list or n_players == 0 or total_remaining == 0:
            return 0.0
        lam = len(card_list) * (cards_per_player / total_remaining) * n_players
        return 1.0 - math.exp(-lam)

    if position == 3:
        p_win = 1.0 if (my_card_takes or partner_winning) else 0.0

    elif my_card_takes:
        p_win = 1.0 - p_someone_has(my_beaters, opponents_after)

    elif partner_winning:
        p_win = 1.0 - p_someone_has(winner_beaters, opponents_after)

    elif partners_after > 0:
        p_partner_saves = p_someone_has(winner_beaters, 1)*0.6
        opp_after_partner = max(0, opponents_after - 1)
        p_win = p_partner_saves * (1.0 - p_someone_has(winner_beaters, opp_after_partner))

    else:
        p_win = 0.0
    total_hand_value = TV + CV
    score = (2.0 * p_win - 1.0) * total_hand_value

    my_pts  = team_score[my_team]

    distance_to_threshold = max(0, 61 - my_pts)
    score += 10 * (1 - distance_to_threshold / 61)

    opp_global = global_score[opponent_team]
    my_global  = global_score[my_team]

    if opp_global >= 3:
        score *= 1.35
    elif my_global >= 3 and opp_global <= 1:
        if card['naipe'] == trunfo:
            score *= 0.80

    if card['naipe'] == trunfo:
            score -= 2*CV*(1-p_win)

    return score

def hard_bot(hand, table_deck, trunfo, played_7, deck_size, played_cards,
             team_score, global_score,
            my_team, trunfo_card):
    opponent_team=(my_team+1)%2
    if deck_size==4:
        have_2=have('2',trunfo, hand) 
        if have_2[0]:
            return hand[have_2[-1]]
        
    winner_card = None
    for card in table_deck:
        if winner_card is None or beats(card, winner_card, trunfo):
            winner_card=card 
    table_deck_ids=[c['id'] for c in table_deck]
    remaining_cards=[c for c in all_cards if c not in played_cards and c not in hand and c['id'] not in table_deck_ids]
    remaining_cards.sort(key=lambda card:(
        card["naipe"]!=trunfo,
        -value[card["number"]])
        )
    
    minor_card=None
    greater_card=None
    for card in hand:
        if minor_card is None or beats(minor_card, card, trunfo, True):
            minor_card=card 
        if greater_card is None or (greater_card['naipe']==trunfo and card['naipe']!=trunfo) or value[card['number']]>value[greater_card['number']]:
            greater_card=card
    have_7=have('7',trunfo, table_deck)
    have_A=have('A',trunfo, table_deck)
    if have_A[0]: 
        if (len(table_deck)-have_A[-1])%2==0:
            if greater_card['naipe']==trunfo: 
                return minor_card
            return greater_card
        else:
            return minor_card
    elif have_7[0]: 
        if (len(table_deck)-have_7[-1])%2==0:
            if greater_card['naipe']==trunfo: 
                return minor_card
            return greater_card
        else:
            have_in_hand_A=have('A', trunfo, hand)
            if have_in_hand_A[0]:
                return hand[have_in_hand_A[-1]]
            else:
                return minor_card 
    
    have_7=have('7', trunfo, hand) 
    card_7=None if have_7[-1] is None else hand[have_7[-1]]
    have_A=have('A', trunfo, hand)
    if have_7[0] and len(table_deck)<3: 
        if have_A[0]:
            other_card=None
            for card in hand:
                if not (card['number'] in ('7', 'A') and card['naipe']==trunfo):
                    other_card=card 
            if other_card is None:
                other_card=card_7
            return card_7 if len(table_deck)==0 else other_card 
        
        dif = global_score[my_team]-global_score[opponent_team]
        cards_winning = len(remaining_cards)
        cards_with_players=(len(remaining_cards)+len(table_deck)-deck_size)/3
        pn=100*cards_with_players/(len(remaining_cards)+len(table_deck))
        if len(table_deck) == 0:
            cards_winning-=cards_with_players*2
        else:
            cards_winning=cards_with_players-1
        pv = 100*cards_winning/(len(remaining_cards)+len(table_deck)) 
        pd = 100-pv-pn

        if len(table_deck) == 0: 
            if dif>=0:
                if pv >= 2*pd*max(dif,1):
                    return card_7
            else:
                if pv >= pd*abs(1/dif): 
                    return card_7
        else: 
            multiplier=max(dif,1) if dif<=0 else 1/dif
            if pv*multiplier >= pd/3:
                return card_7
            

    card_greater=[]
    for card in hand: 
        card_to_evaluate=trunfo_card if card['naipe']==trunfo and card['number']=='2' else card 
        card_greater.append([card, evaluate(card_to_evaluate, 
        hand,  table_deck, trunfo, played_7, deck_size, remaining_cards,
             team_score, global_score, my_team)])
        
    return max(hand, key=lambda card:evaluate(card, hand,  table_deck, trunfo, played_7, deck_size, remaining_cards,
             team_score, global_score, my_team))
