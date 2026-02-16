from random import choice

value={'2': -4,'3': -3,'4': -2,'5':-1,'6': 0,'Q': 2,'J': 3,'K': 4,'7': 10,'A': 11}

def easy_bot(hand):
    return choice(hand)

def medium_bot(hand, table_deck, trunfo):
    hand.sort(key=lambda card:(
        card["naipe"]!=trunfo,
        value[card["number"]])
        )
    return choice(hand)
    

def hard_bot(hand, table_deck, trunfo, played_cards):
    pass