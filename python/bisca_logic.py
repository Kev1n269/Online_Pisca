from random import sample, randint
from copy import deepcopy

def naipe_to_character(naipe): 
    if  naipe=='♠':
        return 'S'
    elif naipe=='♥':
        return 'H'
    elif naipe=='♦':
        return 'D'
    elif naipe=='♣':
        return 'C'
    return naipe

naipes=['♠','♥', '♦','♣']
card_numbers=['2','3','4','5','6','Q','J','K', '7', 'A']
inital_deck=[]
for naipe in naipes: 
    for card_number in card_numbers: 
        inital_deck.append({"id": f"{card_number}{naipe_to_character(naipe)}","naipe": naipe, "number": card_number})

value={'2': -4,'3': -3,'4': -2,'5':-1,'6': 0,'Q': 2,'J': 3,'K': 4,'7': 10,'A': 11}

class game:
    def __init__(self, initial_player=0, players_number=4):
        self.players_number=players_number
        self.initial_player=initial_player
        self.deck=sample(inital_deck, len(inital_deck))
        self.players=[]
        self.team_score=[0,0] 
        self.global_score=[0,0]
        self.table_deck=[]
        self.played_cards=[]
        self.gained_cards=[0,0]
        while True:
            random_card=randint(0, len(self.deck)-1)
            if self.deck[random_card]["number"] not in ('7','A'):   
                break
        self.trunfo_card=self.deck[random_card]
        self.trunfo=self.trunfo_card["naipe"]
        self.deck[0],self.deck[random_card]=self.deck[random_card],self.deck[0]
        self.played_7=False
        self.current_player_number=initial_player
        for i in range(players_number):
            player_deck=self.deck[-3:]
            del self.deck[-3:]
            self.players.append(player_deck)
    
    def _is_trunfo(self, card):
        return card["naipe"]==self.trunfo

    def _is_more_valuable(self, card1, card2, first_naipe):
        if card1["naipe"]==card2["naipe"]:
            return value[card1["number"]] > value[card2["number"]]
        if self._is_trunfo(card1) or self._is_trunfo(card2) :
            return self._is_trunfo(card1)
        return card1["naipe"] == first_naipe

    def _finish_hand(self):
        first_is_7=self._is_trunfo(self.table_deck[0]) and self.table_deck[0]["number"]=='7'
        is_played_A=False
        is_played_7=-1
        winner=-1
        winner_card={}
        initial_naipe=self.table_deck[0]["naipe"]
        hand_value=0

        for card in self.table_deck:
            if self._is_trunfo(card) and card["number"]=='A':
                is_played_A=True
            if self._is_trunfo(card) and card["number"]=='7':
                is_played_7=card["player"]%2
            if winner_card=={} or self._is_more_valuable(card, winner_card, initial_naipe):
                winner=card["player"]
                winner_card=card
            hand_value += max(0, value[card["number"]])

        self.team_score[winner%2]+=hand_value
        self.gained_cards[winner%2]+=len(self.table_deck)
        if is_played_A and is_played_7!=-1:
            if winner%2!=is_played_7:
                self.global_score[winner%2]+=2
        elif first_is_7 and self.deck: 
            self.global_score[winner%2]+=1
        if self.global_score[0]>=4 or self.global_score[1]>=4: 
            return self._finish_game()
        if self.deck:
            current=winner
            for i in range(self.players_number):
                self.players[current].append(self.deck[-1])
                self.deck.pop()
                current=(current+1)%self.players_number
        elif not self.players[0]:
            return self._finish_round()
        
        self.current_player_number=winner
        self.table_deck.clear()
        return {"type": "hand over", "content": self.get_general_state()}
    
    def _finish_round(self):
        if self.team_score[0]>90:
            self.global_score[0]+=2
        elif self.team_score[0]>60:
            self.global_score[0]+=1
        elif self.team_score[1]>90:
            self.global_score[1]+=2
        elif self.team_score[1]>60:
            self.global_score[1]+=1
        else:
            pass

        if self.global_score[0]>=4 or self.global_score[1]>=4:
            return self._finish_game()
        
        self.deck=sample(inital_deck, len(inital_deck))
        self.current_player_number = (self.initial_player+1)%self.players_number
        self.initial_player=(self.initial_player+1)%self.players_number
        self.team_score=[0,0] 
        self.table_deck.clear()
        self.played_cards.clear()
        self.gained_cards=[0,0]
        while True:
            random_card=randint(0, len(self.deck)-1)
            if self.deck[random_card]["number"] not in ('7','A'):   
                break
        self.trunfo_card=self.deck[random_card]
        self.trunfo=self.trunfo_card["naipe"]
        self.deck[0],self.deck[random_card]=self.deck[random_card],self.deck[0]
        self.played_7=False
        current=self.initial_player
        for i in range(self.players_number):
            player_deck=self.deck[-3:]
            del self.deck[-3:]
            self.players[current]=player_deck
            current=(current+1)%self.players_number
        return {"type": "round over", "content":self.get_general_state()}
               
    def _finish_game(self):
        if self.global_score[0]>=4:
            return {"type": "game over", "content": [1,3]}
        elif self.global_score[1]>=4:
            return {"type": "game over", "content": [2,4]}
        else:
            raise ValueError("Nenhum time venceu")

    def play_card(self, card): 
        if len(self.table_deck)==4:
            raise ValueError("Mesa cheia")
        
        current_player=self.players[self.current_player_number]
        if card["naipe"]==self.trunfo:
            if card["number"]=='7' and len(self.table_deck)==3 and len(current_player)==3:  
                raise ValueError("7 jogado no pé")
            if card["number"]=='A' and not self.played_7 and len(current_player)!=1: 
                raise ValueError("Ás jogado antes do 7")

        is_possible=False
        for iterador in range(len(current_player)): 
            deck_card=current_player[iterador]
            if deck_card==card:
                if card["number"]=='2' and self._is_trunfo(card) and self.deck:
                    self.players[self.current_player_number][iterador], self.deck[0] = self.trunfo_card, card
                    trunfo_card=self.trunfo_card
                    self.trunfo_card=card
                    return {"type": "trade", "content": {"new_trunfo_card": card, "old_trunfo_card": trunfo_card, "player_id": self.current_player_number}}
                del self.players[self.current_player_number][iterador]
                self.played_cards.append(card)
                is_possible=True
                break
        if not is_possible:
            raise ValueError("Jogador atual não possui essa carta")
        
        if card["number"]=='7' and self._is_trunfo(card):
            self.played_7=True
        
        self.table_deck.append(card | {"player": self.current_player_number}) 
        if len(self.table_deck)==self.players_number:
            return self._finish_hand()
        self.current_player_number=(self.current_player_number+1)%self.players_number
        return {"type": "none", "content": []}
    
    def get_general_state(self):
        return { 
            "deck": self.deck,
            "trunfo": self.trunfo,
            "team_score": self.team_score, 
            "global_score": self.global_score, 
            "table_deck": self.table_deck,
            "trunfo_card": self.trunfo_card, 
            "current_player": self.current_player_number,
            "players": self.players,
            "played_cards": self.played_cards,
            "gained_cards": self.gained_cards
        }

    def clone(self):
        return deepcopy(self)