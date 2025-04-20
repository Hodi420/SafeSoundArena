import pygame
import sys
import random
import os

# הגדרות ראשוניות
WIDTH, HEIGHT = 800, 600
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
FPS = 60
PADDLE_WIDTH, PADDLE_HEIGHT = 15, 100
BALL_SIZE = 20
PADDLE_SPEED = 7
BALL_SPEED_X, BALL_SPEED_Y = 5, 5

# --- אין בוטים, הכל פשוט ונוסטלגי כמו המקור ---

# שמות שחקנים (ניתן לשנות)
player_left = "Player 1"
player_right = "Player 2"

# ניקוד היסטורי
scores_file = os.path.join("static", "scores.txt")

# טען סאונד (אם קיים)
def load_sound(filename):
    try:
        return pygame.mixer.Sound(filename)
    except Exception:
        return None

beep_sound = load_sound(os.path.join("static", "beep.wav"))
explosion_sound = load_sound(os.path.join("static", "explosion.wav"))

pygame.init()
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("PONG - Atari 1972")
clock = pygame.time.Clock()
font = pygame.font.SysFont("Courier New", 60, bold=True)
small_font = pygame.font.SysFont("Courier New", 28)
mini_font = pygame.font.SysFont("Arial", 18, bold=True)

# לוחות
paddle_left = pygame.Rect(30, HEIGHT//2 - PADDLE_HEIGHT//2, PADDLE_WIDTH, PADDLE_HEIGHT)
paddle_right = pygame.Rect(WIDTH - 30 - PADDLE_WIDTH, HEIGHT//2 - PADDLE_HEIGHT//2, PADDLE_WIDTH, PADDLE_HEIGHT)
# כדור
ball = pygame.Rect(WIDTH//2 - BALL_SIZE//2, HEIGHT//2 - BALL_SIZE//2, BALL_SIZE, BALL_SIZE)
ball_speed_x = BALL_SPEED_X * random.choice([-1, 1])
ball_speed_y = BALL_SPEED_Y * random.choice([-1, 1])

score_left = 0
score_right = 0

def draw_center_dotted_line():
    for y in range(0, HEIGHT, 30):
        pygame.draw.rect(screen, WHITE, (WIDTH//2 - 3, y+5, 6, 20))

def draw_score():
    left = font.render(str(score_left), True, WHITE)
    right = font.render(str(score_right), True, WHITE)
    screen.blit(left, (WIDTH//4 - left.get_width()//2, 30))
    screen.blit(right, (WIDTH*3//4 - right.get_width()//2, 30))

def draw_atari():
    txt = mini_font.render("ATARI", True, WHITE)
    screen.blit(txt, (WIDTH//2 - txt.get_width()//2, HEIGHT - 35))

def reset_ball():
    global ball_speed_x, ball_speed_y
    ball.x, ball.y = WIDTH//2 - BALL_SIZE//2, HEIGHT//2 - BALL_SIZE//2
    ball_speed_x = BALL_SPEED_X * random.choice([-1, 1])
    ball_speed_y = BALL_SPEED_Y * random.choice([-1, 1])

def play_beep():
    if beep_sound: beep_sound.play()
def play_explosion():
    if explosion_sound: explosion_sound.play()

# --- מסך פתיחה ---
def show_intro():
    screen.fill(BLACK)
    title = font.render("PONG", True, WHITE)
    atari = small_font.render("Atari 1972", True, WHITE)
    desc = mini_font.render("המשחק הראשון בהיסטוריה של משחקי וידאו", True, WHITE)
    press = mini_font.render("לחץ SPACE כדי להתחיל", True, WHITE)
    screen.blit(title, (WIDTH//2 - title.get_width()//2, HEIGHT//2 - 120))
    screen.blit(atari, (WIDTH//2 - atari.get_width()//2, HEIGHT//2 - 40))
    screen.blit(desc, (WIDTH//2 - desc.get_width()//2, HEIGHT//2 + 20))
    screen.blit(press, (WIDTH//2 - press.get_width()//2, HEIGHT//2 + 80))
    draw_atari()
    pygame.display.flip()
    waiting = True
    while waiting:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit(); sys.exit()
            if event.type == pygame.KEYDOWN and event.key == pygame.K_SPACE:
                waiting = False
        clock.tick(FPS)

def show_winner(winner):
    screen.fill(BLACK)
    txt = font.render("WINNER!", True, (255,215,0))
    name = small_font.render(winner, True, WHITE)
    screen.blit(txt, (WIDTH//2 - txt.get_width()//2, HEIGHT//2 - 60))
    screen.blit(name, (WIDTH//2 - name.get_width()//2, HEIGHT//2 + 20))
    draw_atari()
    pygame.display.flip()
    pygame.time.wait(2200)

show_intro()

# --- טבלת ניקוד ---
def load_scores():
    scores = {}
    if os.path.exists(scores_file):
        with open(scores_file, 'r', encoding='utf-8') as f:
            for line in f:
                name, val = line.strip().split(':')
                scores[name] = int(val)
    return scores

def save_scores(scores):
    with open(scores_file, 'w', encoding='utf-8') as f:
        for name, val in scores.items():
            f.write(f"{name}:{val}\n")

def show_scores(scores):
    screen.fill(BLACK)
    title = small_font.render("טבלת ניקוד היסטורית", True, WHITE)
    screen.blit(title, (WIDTH//2 - title.get_width()//2, 40))
    y = 110
    for name, val in sorted(scores.items(), key=lambda x: -x[1]):
        txt = mini_font.render(f"{name}: {val}", True, WHITE)
        screen.blit(txt, (WIDTH//2 - txt.get_width()//2, y))
        y += 40
    press = mini_font.render("לחץ SPACE כדי להתחיל משחק חדש", True, WHITE)
    screen.blit(press, (WIDTH//2 - press.get_width()//2, HEIGHT-70))
    pygame.display.flip()
    wait = True
    while wait:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit(); sys.exit()
            if event.type == pygame.KEYDOWN and event.key == pygame.K_SPACE:
                wait = False
        clock.tick(FPS)

# --- לולאת משחק ---
score_to_win = 5
running = True
while running:
    winner = None
    flash_frames = 0
    score_left = 0
    score_right = 0
    reset_ball()
    while not winner and running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

        # תנועת לוחות (פשוט: שחקן שמאל עם W/S, ימין עם חצים)
        keys = pygame.key.get_pressed()
        if keys[pygame.K_w] and paddle_left.top > 0:
            paddle_left.y -= PADDLE_SPEED
        if keys[pygame.K_s] and paddle_left.bottom < HEIGHT:
            paddle_left.y += PADDLE_SPEED
        if keys[pygame.K_UP] and paddle_right.top > 0:
            paddle_right.y -= PADDLE_SPEED
        if keys[pygame.K_DOWN] and paddle_right.bottom < HEIGHT:
            paddle_right.y += PADDLE_SPEED

        # תנועת כדור
        ball.x += ball_speed_x
        ball.y += ball_speed_y

        # קפיצה מהקצה העליון/תחתון
        if ball.top <= 0 or ball.bottom >= HEIGHT:
            ball_speed_y *= -1
            play_beep()
        # פגיעה בלוחות
        if ball.colliderect(paddle_left):
            ball.left = paddle_left.right
            ball_speed_x *= -1
            play_beep()
        if ball.colliderect(paddle_right):
            ball.right = paddle_right.left - 1
            ball_speed_x *= -1
            play_beep()

        # גול
        goal = False
        if ball.left <= 0:
            score_right += 1
            reset_ball()
            play_explosion()
            flash_frames = 12
            goal = True
        if ball.right >= WIDTH:
            score_left += 1
            reset_ball()
            play_explosion()
            flash_frames = 12
            goal = True

        # בדוק ניצחון
        if score_left >= score_to_win:
            winner = player_left
        elif score_right >= score_to_win:
            winner = player_right

        # ציור
        if flash_frames > 0:
            screen.fill((255,60,60))
            flash_frames -= 1
        else:
            screen.fill(BLACK)
        draw_center_dotted_line()
        pygame.draw.rect(screen, WHITE, paddle_left)
        pygame.draw.rect(screen, WHITE, paddle_right)
        pygame.draw.ellipse(screen, WHITE, ball)
        draw_score()
        draw_atari()
        pygame.display.flip()
        clock.tick(FPS)

    # סיום משחק – הצג ווינר, עדכן טבלת ניקוד
    if winner:
        show_winner(winner)
        scores = load_scores()
        scores[winner] = scores.get(winner, 0) + 1
        save_scores(scores)
        show_scores(scores)
        show_intro()

pygame.quit()
sys.exit()
