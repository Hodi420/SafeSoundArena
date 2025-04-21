from flask import Flask, render_template, send_from_directory, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
import random
import os

app = Flask(__name__, static_folder='static')
socketio = SocketIO(app, cors_allowed_origins="*")

WIDTH, HEIGHT = 800, 600
PADDLE_HEIGHT = 100
PADDLE_WIDTH = 15
BALL_SIZE = 20
PADDLE_SPEED = 7
BALL_SPEED = 5

rooms = {}
high_scores = []

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/highscores')
def get_highscores():
    return jsonify(sorted(high_scores, key=lambda x: -x['score'])[:10])

@socketio.on('join')
def on_join(data):
    username = data['username']
    # מצא חדר פנוי או צור חדש
    room = None
    for k, v in rooms.items():
        if len(v['players']) < 2:
            room = k
            break
    if not room:
        room = str(random.randint(1000, 9999))
        rooms[room] = {'players': [], 'game': None, 'bot': False}
    join_room(room)
    rooms[room]['players'].append(username)
    emit('room_joined', {'room': room, 'players': rooms[room]['players']}, room=room)
    # אם יש שני שחקנים, התחל משחק
    if len(rooms[room]['players']) == 2:
        rooms[room]['bot'] = False
        start_game(room)
        emit('system_message', {'msg': 'המשחק מתחיל!'}, room=room)
    # אם רק שחקן אחד, הפעל בוט
    if len(rooms[room]['players']) == 1:
        rooms[room]['bot'] = True
        emit('waiting_for_player', {}, room=room)
        start_game(room)
        emit('system_message', {'msg': 'משחק נגד מחשב!'}, room=room)

def start_game(room):
    # אתחול מצב משחק
    game = {
        'paddles': [HEIGHT//2 - PADDLE_HEIGHT//2, HEIGHT//2 - PADDLE_HEIGHT//2],
        'ball': [WIDTH//2, HEIGHT//2],
        'ball_speed': [BALL_SPEED * random.choice([-1, 1]), BALL_SPEED * random.choice([-1, 1])],
        'score': [0, 0],
        'running': True
    }
    rooms[room]['game'] = game
    socketio.emit('game_start', {'game': game}, room=room)

@socketio.on('move_paddle')
def move_paddle(data):
    room = data['room']
    player = data['player']
    direction = data['direction']
    game = rooms[room]['game']
    idx = rooms[room]['players'].index(player)
    if direction == 'up':
        game['paddles'][idx] = max(0, game['paddles'][idx] - PADDLE_SPEED)
    elif direction == 'down':
        game['paddles'][idx] = min(HEIGHT-PADDLE_HEIGHT, game['paddles'][idx] + PADDLE_SPEED)
    socketio.emit('update', {'game': game}, room=room)

@socketio.on('request_state')
def request_state(data):
    room = data['room']
    game = rooms[room]['game']
    emit('update', {'game': game})

@socketio.on('tick')
def game_tick(data):
    room = data['room']
    game = rooms[room]['game']
    # עדכון מצב הכדור
    ball_x, ball_y = game['ball']
    speed_x, speed_y = game['ball_speed']
    ball_x += speed_x
    ball_y += speed_y
    # בוט (אם צריך)
    if rooms[room].get('bot', False):
        # הבוט יעקוב אחרי הכדור
        bot_y = game['paddles'][1]
        if ball_y > bot_y + PADDLE_HEIGHT//2:
            bot_y = min(HEIGHT - PADDLE_HEIGHT, bot_y + PADDLE_SPEED)
        elif ball_y < bot_y + PADDLE_HEIGHT//2:
            bot_y = max(0, bot_y - PADDLE_SPEED)
        game['paddles'][1] = bot_y
    # קפיצה מהקצה העליון/תחתון
    if ball_y <= 0 or ball_y + BALL_SIZE >= HEIGHT:
        speed_y *= -1
    # פגיעה בלוחות
    # שמאל
    if ball_x <= 30 + PADDLE_WIDTH and game['paddles'][0] <= ball_y <= game['paddles'][0] + PADDLE_HEIGHT:
        speed_x *= -1
    # ימין
    if ball_x + BALL_SIZE >= WIDTH - 30 - PADDLE_WIDTH and game['paddles'][1] <= ball_y <= game['paddles'][1] + PADDLE_HEIGHT:
        speed_x *= -1
    # גול
    if ball_x < 0:
        game['score'][1] += 1
        ball_x, ball_y = WIDTH//2, HEIGHT//2
        speed_x = BALL_SPEED
    if ball_x > WIDTH:
        game['score'][0] += 1
        ball_x, ball_y = WIDTH//2, HEIGHT//2
        speed_x = -BALL_SPEED
    game['ball'] = [ball_x, ball_y]
    game['ball_speed'] = [speed_x, speed_y]
    rooms[room]['game'] = game
    socketio.emit('update', {'game': game}, room=room)

@socketio.on('save_score')
def save_score(data):
    high_scores.append({'username': data['username'], 'score': data['score']})
    try:
        with open(HIGHSCORE_FILE, 'w', encoding='utf-8') as f:
            json.dump(high_scores, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print('Failed to save high scores:', e)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
