# -*- coding: utf-8 -*-
"""
Lineage pitch deck builder.
Team LangGang, Julius Baer challenge, SwissHacks 2026.
Landscape 16:9, 1280 x 720 pt canvas. Pure reportlab vector drawing.
Five slides: cover, the problem, the idea, the experience, why it wins.
"""
import math
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor

OUT = "C:/ChestiiStick/work/projects/julius-bar-challenge/Lineage_Presentation.pdf"

W, H = 1280, 720
MARGIN = 90

# Design tokens
NAVY        = HexColor("#141E3C")
NAVY_SURF   = HexColor("#1B2A4A")
IVORY       = HexColor("#F7F5F0")
PAGE_BG     = HexColor("#EDEAE2")
GOLD        = HexColor("#C9A86A")
GOLD_DARK   = HexColor("#A8854A")
SLATE       = HexColor("#3C4456")
MUTED       = HexColor("#707A8A")
TERRACOTTA  = HexColor("#C8895E")
EMERALD     = HexColor("#5E806B")
FOCUS_RED   = HexColor("#C0392B")
SOFT_IVORY  = HexColor("#E7E3D9")   # body text on dark

SERIF      = "Times-Roman"
SERIF_BOLD = "Times-Bold"
SERIF_IT   = "Times-Italic"
SANS       = "Helvetica"
SANS_BOLD  = "Helvetica-Bold"

c = canvas.Canvas(OUT, pagesize=(W, H))


# ---------- low level helpers ----------

def bg_dark(surface=False):
    c.setFillColor(NAVY)
    c.rect(0, 0, W, H, stroke=0, fill=1)
    if surface:
        c.setFillColor(NAVY_SURF)
        c.rect(0, 0, W, H, stroke=0, fill=1)

def bg_light(ivory=False):
    c.setFillColor(IVORY if ivory else PAGE_BG)
    c.rect(0, 0, W, H, stroke=0, fill=1)

def hairline(x1, y1, x2, y2, col, width=1, dash=None):
    c.setStrokeColor(col)
    c.setLineWidth(width)
    if dash:
        c.setDash(dash, 0)
    else:
        c.setDash()
    c.line(x1, y1, x2, y2)
    c.setDash()

def spaced_text(x, y, text, font, size, color, tracking=2.0):
    """Left aligned text with manual character spacing (letter-spacing)."""
    c.setFont(font, size)
    c.setFillColor(color)
    cur = x
    for ch in text:
        c.drawString(cur, y, ch)
        cur += c.stringWidth(ch, font, size) + tracking
    return cur

def eyebrow(x, y, text, color=GOLD_DARK):
    spaced_text(x, y, text.upper(), SANS_BOLD, 11, color, tracking=2.6)

def gold_rule(x, y, length=64):
    c.setStrokeColor(GOLD)
    c.setLineWidth(2)
    c.setDash()
    c.line(x, y, x + length, y)

def headline(x, y, text, size=34, color=NAVY, max_width=None, leading=None):
    """Serif headline, optional wrap. Returns y after last line."""
    c.setFont(SERIF_BOLD, size)
    c.setFillColor(color)
    lead = leading or size * 1.12
    if max_width is None:
        c.drawString(x, y, text)
        return y - lead
    words = text.split()
    line = ""
    yy = y
    for w in words:
        test = (line + " " + w).strip()
        if c.stringWidth(test, SERIF_BOLD, size) <= max_width:
            line = test
        else:
            c.drawString(x, yy, line)
            yy -= lead
            line = w
    if line:
        c.drawString(x, yy, line)
        yy -= lead
    return yy

def wrap_lines(text, font, size, max_width):
    words = text.split()
    lines, line = [], ""
    for w in words:
        test = (line + " " + w).strip()
        if c.stringWidth(test, font, size) <= max_width:
            line = test
        else:
            lines.append(line)
            line = w
    if line:
        lines.append(line)
    return lines

def bullet_block(x, y, items, max_width, color=SLATE, size=15.5, gap=15,
                 marker=GOLD, lead_factor=1.32, lead_word=None):
    """Bullet list. Each item can be a string or (lead, rest) tuple where
    lead is rendered in a stronger color. Returns final y. The marker dot is
    aligned with the optical centre of the first text line."""
    leading = size * lead_factor
    yy = y
    for it in items:
        if isinstance(it, tuple):
            lead, rest = it
        else:
            lead, rest = None, it
        # marker dot, aligned with the middle of the first line
        c.setFillColor(marker)
        c.circle(x + 3, yy + size * 0.30, 2.6, stroke=0, fill=1)
        tx = x + 18
        full = (lead + " " + rest) if lead else rest
        lines = wrap_lines(full, SANS, size, max_width - 18)
        # render with optional bold lead on the first segment
        first = True
        for ln in lines:
            cx = tx
            if first and lead:
                # split this line into lead-part and remainder
                if ln.startswith(lead):
                    c.setFont(SANS_BOLD, size)
                    c.setFillColor(NAVY if color == SLATE else color)
                    c.drawString(cx, yy, lead)
                    cx += c.stringWidth(lead, SANS_BOLD, size)
                    rem = ln[len(lead):]
                    c.setFont(SANS, size)
                    c.setFillColor(color)
                    c.drawString(cx, yy, rem)
                else:
                    c.setFont(SANS, size)
                    c.setFillColor(color)
                    c.drawString(cx, yy, ln)
            else:
                c.setFont(SANS, size)
                c.setFillColor(color)
                c.drawString(cx, yy, ln)
            yy -= leading
            first = False
        yy -= gap
    return yy

def footer(page_num, dark=False):
    col = MUTED if not dark else HexColor("#8A93A6")
    # wordmark bottom-left
    c.setFont(SERIF, 13)
    c.setFillColor(GOLD if dark else GOLD_DARK)
    c.drawString(MARGIN, 40, "LINEAGE")
    # right side credit + page number
    txt = "Julius Baer · SwissHacks 2026 · Team LangGang · %02d" % page_num
    c.setFont(SANS, 9.5)
    c.setFillColor(col)
    c.drawRightString(W - MARGIN, 40, txt)
    # thin baseline rule
    hairline(MARGIN, 58, W - MARGIN, 58,
             HexColor("#2A3656") if dark else HexColor("#D8D3C7"), 0.8)


# ---------- motif: Wheel of Life ----------

def wheel_of_life(cx, cy, base_r, n=10, palette=None, label=False):
    if palette is None:
        palette = [NAVY_SURF, GOLD, TERRACOTTA, EMERALD, GOLD_DARK]
    radii = [base_r * f for f in
             [1.0, 0.78, 0.92, 0.66, 0.86, 0.72, 0.96, 0.6, 0.82, 0.7]]
    seg = 360.0 / n
    for i in range(n):
        r = radii[i % len(radii)]
        col = palette[i % len(palette)]
        a0 = 90 - i * seg
        c.setFillColor(col)
        c.setStrokeColor(IVORY)
        c.setLineWidth(1.4)
        p = c.beginPath()
        p.moveTo(cx, cy)
        steps = 14
        for s in range(steps + 1):
            ang = math.radians(a0 - seg * s / steps)
            p.lineTo(cx + r * math.cos(ang), cy + r * math.sin(ang))
        p.lineTo(cx, cy)
        p.close()
        c.drawPath(p, stroke=1, fill=1)
    # outer faint ring
    c.setStrokeColor(GOLD)
    c.setLineWidth(1)
    c.setDash(2, 4)
    c.circle(cx, cy, base_r * 1.06, stroke=1, fill=0)
    c.setDash()
    # hub
    c.setFillColor(IVORY)
    c.circle(cx, cy, base_r * 0.13, stroke=0, fill=1)
    c.setFillColor(NAVY)
    c.circle(cx, cy, base_r * 0.07, stroke=0, fill=1)


# ---------- motif: Trust gauge (arc) ----------

def trust_gauge(cx, cy, radius, value=82, on_dark=False):
    # background arc 180deg
    track = HexColor("#2A3656") if on_dark else HexColor("#D8D3C7")
    c.setLineCap(1)
    c.setStrokeColor(track)
    c.setLineWidth(14)
    c.arc(cx - radius, cy - radius, cx + radius, cy + radius, 0, 180)
    # value arc from 180 down to angle
    frac = value / 100.0
    sweep = 180 * frac
    c.setStrokeColor(GOLD)
    c.setLineWidth(14)
    c.arc(cx - radius, cy - radius, cx + radius, cy + radius, 180 - sweep, 180)
    # marker
    ang = math.radians(180 - sweep)
    mx = cx + radius * math.cos(ang)
    my = cy + radius * math.sin(ang)
    c.setFillColor(IVORY)
    c.setStrokeColor(GOLD_DARK)
    c.setLineWidth(2)
    c.circle(mx, my, 8, stroke=1, fill=1)
    c.setLineCap(0)
    # number
    c.setFont(SERIF_BOLD, 34)
    c.setFillColor(IVORY if on_dark else NAVY)
    c.drawCentredString(cx, cy + 6, str(value))
    spaced_text(cx - 30, cy - 14, "TRUST SCORE", SANS_BOLD, 8.5, MUTED, tracking=1.6)


# ---------- motif: agent verification flow ----------

def agent_flow(x, y, width):
    cols = [
        ("Intake", "Documents read", NAVY_SURF, False),
        ("KYC screening", "PEP, sanctions, media", NAVY_SURF, False),
        ("Specialist review", "Tax, succession", NAVY_SURF, False),
        ("Human approval", "A named person signs", GOLD, True),
    ]
    n = len(cols)
    gap = 26
    node_w = (width - gap * (n - 1)) / n
    node_h = 86
    centers = []
    for i, (title, sub, col, gate) in enumerate(cols):
        nx = x + i * (node_w + gap)
        ny = y - node_h
        c.setFillColor(col)
        c.setStrokeColor(GOLD if gate else HexColor("#2A3656"))
        c.setLineWidth(1.6 if gate else 1)
        c.roundRect(nx, ny, node_w, node_h, 12, stroke=1, fill=1)
        c.setFont(SANS_BOLD, 12)
        c.setFillColor(NAVY if gate else SOFT_IVORY)
        c.drawCentredString(nx + node_w / 2, ny + node_h - 30, title)
        c.setFont(SANS, 9.5)
        c.setFillColor(NAVY if gate else HexColor("#9AA3B5"))
        c.drawCentredString(nx + node_w / 2, ny + node_h - 48, sub)
        c.setFillColor(GOLD if gate else GOLD_DARK)
        for d in range(3):
            c.circle(nx + 18 + d * 12, ny + 18, 2.4, stroke=0, fill=1)
        if gate:
            c.setStrokeColor(NAVY)
            c.setLineWidth(2.2)
            c.setLineCap(1)
            bx = nx + node_w - 26
            by = ny + 18
            c.line(bx - 5, by, bx - 1, by - 4)
            c.line(bx - 1, by - 4, bx + 6, by + 5)
            c.setLineCap(0)
        centers.append((nx, ny + node_h / 2, node_w))
    for i in range(n - 1):
        x1 = centers[i][0] + centers[i][2]
        x2 = centers[i + 1][0]
        yy = centers[i][1]
        hairline(x1 + 3, yy, x2 - 3, yy, GOLD, 1.4, dash=(3, 4))
        c.setFillColor(GOLD)
        p = c.beginPath()
        p.moveTo(x2 - 3, yy)
        p.lineTo(x2 - 11, yy + 4)
        p.lineTo(x2 - 11, yy - 4)
        p.close()
        c.drawPath(p, stroke=0, fill=1)


# ---------- motif: phone frame ----------

def phone_frame(x, y, w, h):
    c.setFillColor(NAVY)
    c.setStrokeColor(GOLD)
    c.setLineWidth(2)
    c.roundRect(x, y, w, h, 22, stroke=1, fill=1)
    c.setFillColor(NAVY_SURF)
    c.roundRect(x + 8, y + 14, w - 16, h - 40, 14, stroke=0, fill=1)
    c.setFillColor(GOLD)
    c.roundRect(x + w / 2 - 18, y + h - 16, 36, 5, 2.5, stroke=0, fill=1)
    c.setFillColor(HexColor("#2A3656"))
    c.roundRect(x + w / 2 - 22, y + 9, 44, 4, 2, stroke=0, fill=1)
    return (x + 8, y + 14, w - 16, h - 40)


# ===================================================================
# SLIDE 1 — Cover (DARK)
# ===================================================================
def slide_cover():
    bg_dark()
    c.setFillColor(NAVY_SURF)
    c.rect(W * 0.62, 0, W * 0.38, H, stroke=0, fill=1)
    wheel_of_life(W * 0.81, H * 0.52, 168)

    eyebrow(MARGIN, H - 150, "Julius Baer · SwissHacks 2026 · Team LangGang", GOLD)
    gold_rule(MARGIN, H - 168, 70)

    c.setFont(SERIF_BOLD, 96)
    c.setFillColor(IVORY)
    c.drawString(MARGIN, H - 280, "Lineage")

    c.setFont(SERIF_IT, 21)
    c.setFillColor(GOLD)
    c.drawString(MARGIN, H - 330, "A living record of how a family's wealth was built,")
    c.drawString(MARGIN, H - 358, "and where it is going.")

    c.setFont(SANS, 15)
    c.setFillColor(SOFT_IVORY)
    c.drawString(MARGIN, H - 410,
                 "The challenge: Reimagining Online and Mobile Banking in Private Banking.")

    footer(1, dark=True)
    c.showPage()


# ===================================================================
# SLIDE 2 — The problem (LIGHT)
# ===================================================================
def slide_problem():
    bg_light()
    eyebrow(MARGIN, H - 130, "What is broken today")
    gold_rule(MARGIN, H - 148, 64)
    headline(MARGIN, H - 196,
             "The intake is done for the bank, then it dies in a file.",
             size=35, color=NAVY, max_width=W - 2 * MARGIN)

    items = [
        ("The relationship manager comes first.",
         "They want to be proactive, but admin eats the hours that belong to the client. "
         "They meet a client about four times a year, and each one has to count."),
        ("The client fills the forms once.",
         "The data goes into a folder and never comes back to them as anything they can use."),
        ("Everyone sees the same eBanking.",
         "It records transactions. It does not react to a person's life."),
        ("Advice sits in 80-page piles.",
         "Screening checks hundreds of sources by hand, and most hits are false alarms."),
    ]
    bullet_block(MARGIN, H - 280, items, max_width=760, size=15.5, gap=17)

    # "dead file" glyph on the right
    fx = W - MARGIN - 230
    fy = H - 470
    c.setFillColor(IVORY)
    c.setStrokeColor(HexColor("#D8D3C7"))
    c.setLineWidth(1)
    c.roundRect(fx, fy, 230, 290, 14, stroke=1, fill=1)
    for i, col in enumerate([HexColor("#D8D3C7"), MUTED, NAVY_SURF]):
        c.setFillColor(col)
        c.roundRect(fx + 40, fy + 70 + i * 26, 150, 60, 6, stroke=0, fill=1)
    c.setFillColor(TERRACOTTA)
    c.circle(fx + 165, fy + 210, 16, stroke=0, fill=1)
    c.setFont(SANS_BOLD, 13)
    c.setFillColor(IVORY)
    c.drawCentredString(fx + 165, fy + 206, "!")
    c.setFont(SERIF_IT, 12)
    c.setFillColor(SLATE)
    c.drawCentredString(fx + 115, fy + 36, "Filled once. Never returned.")

    footer(2)
    c.showPage()


# ===================================================================
# SLIDE 3 — The idea (DARK)
# ===================================================================
def slide_idea():
    bg_dark()
    c.setFillColor(NAVY_SURF)
    c.rect(0, 0, W * 0.40, H, stroke=0, fill=1)
    eyebrow(MARGIN, H - 130, "The idea", GOLD)
    gold_rule(MARGIN, H - 148, 64)
    headline(MARGIN, H - 200,
             "Turn dead intake into a living document the client co-owns.",
             size=33, color=IVORY, max_width=520)

    items = [
        ("From the same KYC data,",
         "AI reads a person's direction, not a pile of transactions."),
        ("A team of AI agents does the bureaucracy",
         "and routes every risk call to the right human."),
        ("Each call routes to the right desk:",
         "wealth planner, tax, succession, or compliance."),
        ("The RM stays at the centre.",
         "The work around them gets quieter."),
    ]
    bullet_block(MARGIN, H - 320, items, max_width=560, size=15.5, gap=17,
                 color=SOFT_IVORY, marker=GOLD)

    # transformation diagram on the right
    rx = W * 0.58
    # left "form" card
    c.setFillColor(NAVY_SURF)
    c.setStrokeColor(HexColor("#2A3656"))
    c.setLineWidth(1)
    c.roundRect(rx, H - 360, 150, 200, 12, stroke=1, fill=1)
    c.setFont(SANS_BOLD, 11)
    c.setFillColor(MUTED)
    c.drawCentredString(rx + 75, H - 190, "DEAD FORM")
    for i in range(5):
        hairline(rx + 22, H - 230 - i * 22, rx + 128, H - 230 - i * 22,
                 HexColor("#2A3656"), 3)
    # arrow, kept short so it stops well before the wheel
    ax = rx + 172
    ay = H - 260
    c.setStrokeColor(GOLD)
    c.setLineWidth(2.5)
    c.line(ax, ay, ax + 40, ay)
    c.setFillColor(GOLD)
    p = c.beginPath()
    p.moveTo(ax + 48, ay)
    p.lineTo(ax + 38, ay + 7)
    p.lineTo(ax + 38, ay - 7)
    p.close()
    c.drawPath(p, stroke=0, fill=1)
    c.setFont(SANS, 9)
    c.setFillColor(GOLD)
    c.drawCentredString(ax + 24, ay + 12, "AI agents")
    # right living wheel, nudged right to clear the arrow
    wheel_of_life(rx + 350, H - 260, 92)
    c.setFont(SANS_BOLD, 11)
    c.setFillColor(GOLD)
    c.drawCentredString(rx + 350, H - 380, "LIVING DOCUMENT")

    footer(3, dark=True)
    c.showPage()


# ===================================================================
# SLIDE 4 — The experience, client + RM (LIGHT)
# ===================================================================
def slide_experience():
    bg_light()
    eyebrow(MARGIN, H - 130, "What it is")
    gold_rule(MARGIN, H - 148, 64)
    headline(MARGIN, H - 196, "The same intake, two views.", size=38, color=NAVY)

    mid = W / 2 + 10
    # vertical divider
    hairline(mid, H - 250, mid, 150, HexColor("#D8D3C7"), 1)

    # LEFT — client
    spaced_text(MARGIN, H - 250, "FOR THE CLIENT", SANS_BOLD, 11, GOLD_DARK, 2.4)
    client = [
        ("Wealth Journey.", "How the family wealth was built, told as a story."),
        ("Wheel of Life.", "Ten areas of life the client shapes themselves."),
        ("Life-Plan Feasibility.",
         "Can I afford the studies and the house, travel as we want, and still retire at 65."),
        ("What's Next.", "Move a priority, and the RM is quietly ready for it."),
    ]
    bullet_block(MARGIN, H - 290, client, max_width=mid - MARGIN - 40, size=14.5, gap=15)

    # RIGHT — relationship manager
    rcol = mid + 40
    spaced_text(rcol, H - 250, "FOR THE RELATIONSHIP MANAGER", SANS_BOLD, 11, GOLD_DARK, 2.0)
    rm = [
        ("Trust Score and Action Points.", "The state of each relationship at a glance."),
        ("Agent Verification Flow.",
         "AI checks run, and a named person approves each item, with a full audit trail."),
        ("Approvals queue.", "Confidence, reasoning, and the source behind every call."),
        ("Next-Conversation prep.", "When a client's priorities move, you walk in ready."),
    ]
    bullet_block(rcol, H - 290, rm, max_width=W - MARGIN - rcol, size=14.5, gap=15)

    # tie-line at the bottom
    c.setFont(SERIF_IT, 15)
    c.setFillColor(GOLD_DARK)
    c.drawCentredString(W / 2, 110,
                        "One intake. The client sees their story. The RM sees what needs a decision.")

    footer(4)
    c.showPage()


# ===================================================================
# SLIDE 5 — Why it wins + close (LIGHT)
# ===================================================================
def slide_why():
    bg_light()
    eyebrow(MARGIN, H - 120, "Why it wins")
    gold_rule(MARGIN, H - 138, 64)
    headline(MARGIN, H - 182,
             "KYC became a living wealth story the client co-owns.",
             size=31, color=NAVY, max_width=W - 2 * MARGIN)
    c.setFont(SERIF_IT, 16)
    c.setFillColor(GOLD_DARK)
    c.drawString(MARGIN, H - 214, "AI did the bureaucracy. A human owned every risk call.")

    crits = [
        ("Client-centric innovation.",
         "The dead form becomes value the client can see and shape."),
        ("Experience and design.",
         "One calm layout on web and mobile. Plain words, one decision per screen."),
        ("Technical feasibility.",
         "A real multi-agent pipeline, an honest stack, and it deploys today."),
        ("Strategic impact.",
         "Julius Baer looks modern, and the RM stays the heart of it."),
    ]
    cw = (W - 2 * MARGIN - 36) / 2
    ch = 96
    gx, gy = 36, 26
    x0, y0 = MARGIN, H - 270
    for i, (name, line) in enumerate(crits):
        col = i % 2
        row = i // 2
        cx0 = x0 + col * (cw + gx)
        cy0 = y0 - row * (ch + gy)
        c.setFillColor(IVORY)
        c.setStrokeColor(HexColor("#D8D3C7"))
        c.setLineWidth(1)
        c.roundRect(cx0, cy0 - ch, cw, ch, 12, stroke=1, fill=1)
        # number chip
        c.setFillColor(NAVY)
        c.circle(cx0 + 34, cy0 - 34, 17, stroke=0, fill=1)
        c.setFont(SERIF_BOLD, 16)
        c.setFillColor(GOLD)
        c.drawCentredString(cx0 + 34, cy0 - 40, str(i + 1))
        c.setFont(SERIF_BOLD, 17)
        c.setFillColor(GOLD_DARK)
        c.drawString(cx0 + 64, cy0 - 32, name)
        c.setFont(SANS, 12.5)
        c.setFillColor(SLATE)
        ty = cy0 - 54
        for l in wrap_lines(line, SANS, 12.5, cw - 80):
            c.drawString(cx0 + 64, ty, l)
            ty -= 16

    # guardrail strip
    sy = 96
    c.setFillColor(NAVY)
    c.roundRect(MARGIN, sy, W - 2 * MARGIN, 44, 10, stroke=0, fill=1)
    c.setFont(SANS, 12.5)
    c.setFillColor(SOFT_IVORY)
    c.drawCentredString(W / 2, sy + 17,
                        "Inside the lines that matter: no KYC or AML decision change, "
                        "no IBANs or payments, a named human approves every call.")

    footer(5)
    c.showPage()


# build
slide_cover()
slide_problem()
slide_idea()
slide_experience()
slide_why()
c.save()
print("WROTE", OUT)
