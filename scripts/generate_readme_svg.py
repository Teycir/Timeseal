
import html

ascii_art = [
    "████████╗██╗███╗   ███╗███████╗    ███████╗███████╗ █████╗ ██╗",
    "╚══██╔══╝██║████╗ ████║██╔════╝    ██╔════╝██╔════╝██╔══██╗██║",
    "   ██║   ██║██╔████╔██║█████╗      ███████╗█████╗  ███████║██║",
    "   ██║   ██║██║╚██╔╝██║██╔══╝      ╚════██║██╔══╝  ██╔══██║██║",
    "   ██║   ██║██║ ╚═╝ ██║███████╗    ███████║███████╗██║  ██║███████╗",
    "   ╚═╝   ╚═╝╚═╝     ╚═╝╚══════╝    ╚══════╝╚══════╝╚═╝  ╚═╝╚══════╝"
]

width = 800
height = 150
font_size = 12
line_height = 16

# Calculate centering
num_lines = len(ascii_art)
text_height = num_lines * line_height
y_start = (height - text_height) / 2 + line_height # Center vertically, +line_height for baseline

svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}">
  <style>
    @font-face {{
      font-family: 'Courier New';
      src: local('Courier New');
    }}
    .ascii-text {{
      font-family: 'Courier New', monospace;
      font-size: {font_size}px;
      fill: #00ff00;
      font-weight: bold;
      white-space: pre;
      text-anchor: middle;
    }}
    .scanline {{
      fill: url(#grad);
      animation: scan 3s linear infinite;
      opacity: 0.3;
    }}
    @keyframes scan {{
      0% {{ transform: translateY(-100%); }}
      100% {{ transform: translateY(100%); }}
    }}
    @keyframes flicker {{
        0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% {{
            opacity: 0.99;
            filter: drop-shadow(0 0 0 transparent);
        }}
        20%, 24%, 55% {{
            opacity: 0.5;
            filter: drop-shadow(0 0 5px #00ff00);
        }}
    }}
    .container {{
        animation: flicker 4s infinite;
    }}
  </style>
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#00ff00" stop-opacity="0" />
      <stop offset="50%" stop-color="#00ff00" stop-opacity="1" />
      <stop offset="100%" stop-color="#00ff00" stop-opacity="0" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="#0d1117" />
  <g class="container">
'''

for i, line in enumerate(ascii_art):
    y = y_start + (i * line_height)
    line_escaped = html.escape(line)
    # x is set to 50% of width (400) for centering
    svg_content += f'    <text x="{width/2}" y="{y}" class="ascii-text">{line_escaped}</text>\n'

svg_content += f'''
  </g>
  <rect width="100%" height="20" class="scanline" />
</svg>
'''

with open("public/timeseal_ascii.svg", "w") as f:
    f.write(svg_content)

print("SVG generated at public/timeseal_ascii.svg")
