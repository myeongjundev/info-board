from __future__ import annotations

import subprocess
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "t04-game-pulse-submission-draft.pdf"

NAVY = colors.HexColor("#09111F")
INK = colors.HexColor("#162033")
MUTED = colors.HexColor("#667085")
LINE = colors.HexColor("#D7DFEA")
PALE = colors.HexColor("#F4F7FB")
CYAN = colors.HexColor("#0891B2")
PURPLE = colors.HexColor("#7C3AED")
GREEN = colors.HexColor("#15803D")
ORANGE = colors.HexColor("#C2410C")


def register_fonts() -> tuple[str, str]:
    regular_candidates = [
        Path("C:/Windows/Fonts/malgun.ttf"),
        Path("C:/Windows/Fonts/NotoSansKR-Regular.ttf"),
    ]
    bold_candidates = [
        Path("C:/Windows/Fonts/malgunbd.ttf"),
        Path("C:/Windows/Fonts/NotoSansKR-Bold.ttf"),
    ]
    regular = next((path for path in regular_candidates if path.exists()), None)
    bold = next((path for path in bold_candidates if path.exists()), None)
    if regular is None or bold is None:
        raise FileNotFoundError("한글 PDF 글꼴을 찾지 못했습니다.")
    pdfmetrics.registerFont(TTFont("Korean", str(regular)))
    pdfmetrics.registerFont(TTFont("KoreanBold", str(bold)))
    return "Korean", "KoreanBold"


REGULAR, BOLD = register_fonts()


def current_sha() -> str:
    return subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
    ).strip()


def p(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(text, style)


styles = getSampleStyleSheet()
styles.add(
    ParagraphStyle(
        name="KTitle",
        fontName=BOLD,
        fontSize=25,
        leading=29,
        textColor=colors.white,
        alignment=TA_LEFT,
        wordWrap="CJK",
    )
)
styles.add(
    ParagraphStyle(
        name="KSubtitle",
        fontName=REGULAR,
        fontSize=9.2,
        leading=14,
        textColor=colors.HexColor("#C9D8EA"),
        wordWrap="CJK",
    )
)
styles.add(
    ParagraphStyle(
        name="KLabel",
        fontName=BOLD,
        fontSize=7.5,
        leading=9,
        textColor=colors.white,
        alignment=TA_CENTER,
        wordWrap="CJK",
    )
)
styles.add(
    ParagraphStyle(
        name="KSection",
        fontName=BOLD,
        fontSize=12,
        leading=15,
        textColor=INK,
        spaceAfter=5,
        wordWrap="CJK",
    )
)
styles.add(
    ParagraphStyle(
        name="KBody",
        fontName=REGULAR,
        fontSize=8.2,
        leading=12.2,
        textColor=INK,
        wordWrap="CJK",
    )
)
styles.add(
    ParagraphStyle(
        name="KBodyBold",
        fontName=BOLD,
        fontSize=8.2,
        leading=12.2,
        textColor=INK,
        wordWrap="CJK",
    )
)
styles.add(
    ParagraphStyle(
        name="KSmall",
        fontName=REGULAR,
        fontSize=7.2,
        leading=10,
        textColor=MUTED,
        wordWrap="CJK",
    )
)
styles.add(
    ParagraphStyle(
        name="KUrl",
        fontName=REGULAR,
        fontSize=7.4,
        leading=10,
        textColor=CYAN,
        wordWrap="CJK",
    )
)


def numbered_label(number: str, title: str, color: colors.Color) -> Table:
    badge = Table([[p(number, styles["KLabel"])]], colWidths=[8 * mm], rowHeights=[8 * mm])
    badge.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), color),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BOX", (0, 0), (-1, -1), 0, color),
            ]
        )
    )
    row = Table(
        [[badge, p(title, styles["KSection"])]],
        colWidths=[10 * mm, 170 * mm],
        hAlign="LEFT",
    )
    row.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))
    return row


def build() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    sha = current_sha()
    result_url = "https://myeongjundev.github.io/info-board/"
    source_url = f"https://github.com/myeongjundev/info-board/tree/{sha}"

    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        leftMargin=14 * mm,
        rightMargin=14 * mm,
        topMargin=12 * mm,
        bottomMargin=10 * mm,
        title="SKT ALEPH T04 - GAME PULSE 제출용 임시본",
        author="myeongjundev",
        subject="T04 검증 안내서와 AI 3줄",
    )

    story = []

    hero_left = [
        p("SKT ALEPH · T04", styles["KSubtitle"]),
        p("GAME PULSE", styles["KTitle"]),
        p(
            "게임 시장을 네 가지 신호로 읽고, 숫자를 어디까지 믿어도 되는지 함께 보여주는 정보판",
            styles["KSubtitle"],
        ),
    ]
    draft = Table([[p("임시 제출본", styles["KLabel"])]], colWidths=[25 * mm], rowHeights=[8 * mm])
    draft.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), PURPLE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )
    hero = Table([[hero_left, draft]], colWidths=[150 * mm, 28 * mm], rowHeights=[33 * mm])
    hero.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), NAVY),
                ("LEFTPADDING", (0, 0), (0, 0), 8 * mm),
                ("RIGHTPADDING", (-1, 0), (-1, 0), 3 * mm),
                ("TOPPADDING", (0, 0), (0, 0), 4 * mm),
                ("VALIGN", (0, 0), (0, 0), "MIDDLE"),
                ("VALIGN", (-1, 0), (-1, 0), "TOP"),
            ]
        )
    )
    story.extend([hero, Spacer(1, 5 * mm)])

    url_table = Table(
        [
            [p("결과물", styles["KBodyBold"]), p(f'<link href="{result_url}">{result_url}</link>', styles["KUrl"])],
            [p("소스 스냅샷", styles["KBodyBold"]), p(f'<link href="{source_url}">{source_url}</link>', styles["KUrl"])],
        ],
        colWidths=[25 * mm, 153 * mm],
    )
    url_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), PALE),
                ("GRID", (0, 0), (-1, -1), 0.5, LINE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 2.2 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2.2 * mm),
            ]
        )
    )
    story.extend([url_table, Spacer(1, 5 * mm)])

    story.append(numbered_label("01", "검증 안내서 - 어디로 가나요 / 무엇을 하나요", CYAN))
    steps = [
        [p("1", styles["KBodyBold"]), p("공개 화면을 열고 동시접속자 값·단위·잰 날·측정 시각·Asia/Seoul·데이터 상태를 확인합니다.", styles["KBody"])],
        [p("2", styles["KBodyBold"]), p("왼쪽 <b>데이터 품질</b>을 누르고 내려가 <b>펼쳐서 손으로 대조하기</b>를 엽니다.", styles["KBody"])],
        [p("3", styles["KBodyBold"]), p("주소 끝에 <b>?replay=timeout</b>을 붙여 연 뒤 <b>다시 시도 · T04-RECOVER-D2</b>를 누릅니다.", styles["KBody"])],
    ]
    step_table = Table(steps, colWidths=[9 * mm, 169 * mm])
    step_table.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.5, LINE),
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#E6F7FB")),
                ("TEXTCOLOR", (0, 0), (0, -1), CYAN),
                ("ALIGN", (0, 0), (0, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 3 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 3 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 2 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2 * mm),
            ]
        )
    )
    story.extend([step_table, Spacer(1, 4 * mm)])

    story.append(numbered_label("02", "무엇이 보이면 통과인가요", GREEN))
    pass_cells = [
        p("<b>실제 데이터</b><br/>값과 단위 `명`, 잰 날, 조회 시각, Asia/Seoul, 데이터 상태가 서로 구분됩니다.", styles["KBody"]),
        p("<b>출처와 계산</b><br/>Steam 원자료·저장값·이전값·손계산·계산값·화면값이 한 자리에서 연결됩니다.", styles["KBody"]),
        p("<b>실패 후 복구</b><br/>stale / timeout · 105 pt · 1건 → fresh / none · 120 pt · 2건 · +15 pt로 바뀝니다.", styles["KBody"]),
    ]
    pass_table = Table([pass_cells], colWidths=[59.3 * mm] * 3)
    pass_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F0FDF4")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#BBE3C4")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 3.2 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 3.2 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 3 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3 * mm),
            ]
        )
    )
    story.extend([pass_table, Spacer(1, 4 * mm)])

    story.append(numbered_label("03", "안 될 때", ORANGE))
    failure = p(
        "자료를 못 읽으면 마지막 정상값과 원래 조회 시각을 유지하고 <b>오래된 자료</b>와 실패 이유를 표시합니다. "
        "정상값도 없으면 `—`를 표시합니다. <b>?fault=timeout|auth|rate-limit|offline|schema</b>로 다섯 장애의 서로 다른 안내를 확인할 수 있습니다. "
        "원자료의 현재 숫자와 화면의 저장 숫자가 달라도 정상입니다. 동시접속자는 호출 순간마다 달라집니다.",
        styles["KBody"],
    )
    failure_table = Table([[failure]], colWidths=[178 * mm])
    failure_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FFF7ED")),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#FED7AA")),
                ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 3 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3 * mm),
            ]
        )
    )
    story.extend([failure_table, Spacer(1, 4 * mm)])

    story.append(numbered_label("04", "AI 활용 3줄", PURPLE))
    ai_rows = [
        [p("AI에게 맡긴 일", styles["KBodyBold"]), p("Codex와 Claude에게 데이터 수집기, 화면 구현, 오류 상태 재현, 회귀 테스트와 문서 정리를 맡겼습니다.", styles["KBody"])],
        [p("내가 판단한 일", styles["KBodyBold"]), p("지역마다 게임 이용 시간이 다르다는 점을 짚고, 같은 날 다른 시각의 접속자 수를 비교하는 기능을 넣기로 결정했습니다.", styles["KBody"])],
        [p("AI 말을 안 들은 일", styles["KBodyBold"]), p("AI는 게임 수가 적어 장르 분석을 확대하지 말자고 했지만, 표본 범위와 분모를 화면에 밝히는 조건으로 장르 분석을 추가했습니다.", styles["KBody"])],
    ]
    ai_table = Table(ai_rows, colWidths=[35 * mm, 143 * mm])
    ai_table.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.5, LINE),
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F3E8FF")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 3.2 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 3.2 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 2.4 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2.4 * mm),
            ]
        )
    )
    story.extend([KeepTogether(ai_table), Spacer(1, 3 * mm)])

    footer = Table(
        [[p("GAME PULSE · SKT ALEPH T04", styles["KSmall"]), p(f"임시본 · 소스 {sha[:8]}", styles["KSmall"])]],
        colWidths=[110 * mm, 68 * mm],
    )
    footer.setStyle(
        TableStyle(
            [
                ("LINEABOVE", (0, 0), (-1, 0), 0.5, LINE),
                ("ALIGN", (-1, 0), (-1, 0), "RIGHT"),
                ("TOPPADDING", (0, 0), (-1, -1), 2 * mm),
            ]
        )
    )
    story.append(footer)

    doc.build(story)
    print(OUTPUT)


if __name__ == "__main__":
    build()
