I am making a project and i want you to code it out

the idea is:  making a minimalistic web version of cluedo(turn based no map needed)

rules: 
all basic cluedo rules apply with one exception, no dice and map needed, simple turn based logic, where everyone has the freedom to call any room with any weapon by any suspect.
Wrong guess, you are eliminated, game goes on
correct guess, you win the game, game ends

All cards must be distributed, uneven distribution is allowed
A player names a Suspect, Weapon, and Room. The other players (in clockwise order) must try to "disprove" it by showing one matching card if they have it. This happens every turn.
Accusation (The win condition): This is the "final guess." If correct, they win. If wrong, they are eliminated (can no longer guess, but must still show cards to others).
We keep the freedom absolute. You can suggest the "Kitchen" even if you hold the "Kitchen" card (to bluff).
If a players has one of the cards that a player(within their turn) makes a suggestion about, they are compeled to tell it to that player, from the perspective of other players they just get informed that X players has responed to the suggestion(private socket event)    

architecture:
* no login needed
* room based gameplay, room locks when it reaches max capacity(6) or owner of the room starts the game(started===locked)
* random card distribution logic and 3 cards from each deck to be chosen as the answer set(which the other players try to guess)
* user state should be maintained if the game was not completed and the user exited, unless the user aborts manually
* players can make a guess at any time and wrong guess==eliminated
* 1 user can chat with another on a personal window without the others knowing 
* When a user lands on the site, generate a userId (UUID) and store it in localStorage.When they join a room, map that userId to the socket.id on the server.
* Reconnect: If they reopen the tab, the client sends the userId from localStorage. The server recognizes they are part of an active game and "rebinds" their new socket to the existing player state.

Frontend(pages required):
1. room creation or room joining page + Name choosing (each player can choose their own name)
2. waiting page(real time players joining, transparent for everyone to see)
3. gameplay page (simple page, where the player with their turn is highlighed to everyone + the persons guess is displayed to everyone whenever that is made)
4. when the game ends we move back to the first page
      Theme: dark colors and with each player having a unique colors of their own
Technology:
* socket.io for full duplex connection
* next.js frontend
* node.js backend + express
* language: TypeScript