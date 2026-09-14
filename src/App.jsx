import { useState, useEffect, useRef, forwardRef } from "react";

/* ---------------- math markup renderer ----------------
   Convert lightweight markup ^{...} (superscript) and _{...} (subscript)
   plus \n line breaks into React nodes. */
function renderMath(text, keyPrefix = "m") {
  if (!text) return null;
  const lines = String(text).split("\n");
  const nodes = [];
  lines.forEach((line, li) => {
    if (li > 0) nodes.push(<br key={`${keyPrefix}-br-${li}`} />);
    const regex = /\^\{([^}]*)\}|_\{([^}]*)\}/g;
    let last = 0,
      m,
      idx = 0;
    while ((m = regex.exec(line)) !== null) {
      if (m.index > last) {
        nodes.push(
          <span key={`${keyPrefix}-${li}-${idx++}`}>{line.slice(last, m.index)}</span>
        );
      }
      if (m[1] !== undefined) {
        nodes.push(<sup key={`${keyPrefix}-${li}-${idx++}`}>{m[1]}</sup>);
      } else {
        nodes.push(<sub key={`${keyPrefix}-${li}-${idx++}`}>{m[2]}</sub>);
      }
      last = regex.lastIndex;
    }
    if (last < line.length) {
      nodes.push(<span key={`${keyPrefix}-${li}-${idx++}`}>{line.slice(last)}</span>);
    }
  });
  return nodes;
}

function plainPreview(text, max = 70) {
  if (!text) return "";
  const stripped = text
    .replace(/\^\{([^}]*)\}/g, "$1")
    .replace(/_\{([^}]*)\}/g, "$1")
    .replace(/\n/g, " ");
  return stripped.length > max ? stripped.slice(0, max) + "…" : stripped;
}

function uid(prefix = "p") {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

const CIRCLED = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧"];

/* ---------------- seed data ---------------- */
const SEED_PROBLEMS = [
  { id: "g-mc-1", type: "mc", source: "공통수학1", text: "두 다항식 A=-x²+4xy-3y², B=3x²-y²에 대하여 A-3B를 간단히 하면?", options: ["10x²+4xy-3y²", "10x²+3y²", "-10x²-3y²", "-10x²+4xy", "10x²+4xy"] },
  { id: "g-mc-2", type: "mc", source: "공통수학1", text: "다항식 P(x)=2x³-2x²+3x+2를 x+1로 나누었을 때, 나머지 값은?", options: ["-10", "-5", "0", "5", "10"] },
  { id: "g-mc-3", type: "mc", source: "공통수학1", text: "다항식 x³+ax²+2x+4가 x+1로 나누어떨어질 때, 상수 a의 값은?", options: ["-3", "-1", "0", "1", "3"] },
  { id: "g-mc-4", type: "mc", source: "공통수학1", text: "2ax²y-4axy를 인수분해하면?", options: ["2ax(2x-y)", "2ay(2x²-y²)", "2axy(x-2)", "axy(x-2y)", "ax²(2-y)"] },
  { id: "g-mc-5", type: "mc", source: "공통수학1", text: "복소수 2+5i의 켤레복소수의 값은?", options: ["-5-2i", "5-2i", "-2+5i", "2-5i", "2+5i"] },
  { id: "g-mc-6", type: "mc", source: "공통수학1", text: "이차방정식 x²+kx-2k+8=0의 한 근이 -2일 때, 다른 한 근은? (단, k는 상수이다.)", options: ["-2", "-1", "0", "1", "2"] },
  { id: "g-mc-7", type: "mc", source: "공통수학1", text: "다음 이차함수의 그래프 중 x축과 만나지 않는 것은?", options: ["y=x²-6x+9", "y=2x²-4x+3", "y=3x²+5x-7", "y=-x²+4x-2", "y=x²-3x+1"] },
  { id: "g-mc-8", type: "mc", source: "공통수학1", text: "세 다항식 A=x³-2x²+x-3, B=x³+4x-1, C=-3x³+2x²+x-5에 대하여 A-3(A-B)+C를 계산하면?", options: ["-2x³+2x²+6x-11", "-2x³+11x²+6x-2", "-2x³+6x²+11x-2", "2x³-6x²-11x+2", "2x³+6x²+11x-2"] },
  { id: "g-mc-9", type: "mc", source: "공통수학1", text: "다항식 f(x)를 x-1로 나누었을 때의 몫을 Q(x), 나머지를 R이라 할 때, f(x)를 3x-3으로 나누었을 때의 몫과 나머지를 차례대로 적은 것은?", options: ["Q(x), R", "Q(x), 3R", "(1/3)Q(x), R", "(1/3)Q(x), R/3", "3Q(x), 3R"] },
  { id: "g-mc-10", type: "mc", source: "공통수학1", text: "다항식 x³+ax-6을 x²+2x+b로 나눌 때, 나머지가 x+2가 되도록 하는 상수 a, b의 합 a+b의 값은?", options: ["9", "8", "7", "6", "5"] },
  { id: "g-mc-11", type: "mc", source: "공통수학1", text: "등식 (x+1)³+a(x+1)²+b(x+1)+c=x³+3x²-2x-7이 x에 대한 항등식일 때, 상수 a, b, c에 대하여 a+b-2c의 값은?", options: ["1", "2", "3", "4", "5"] },
  { id: "g-mc-12", type: "mc", source: "공통수학1", text: "다음 중 옳지 않은 것은?", options: ["a³-9a²+27a-27=(a-3)³", "x³-12x²y+48xy²-64y³=(x-4y)³", "x³+125=(x+5)(x²-10x+25)", "x³+8x²+7x=x(x+1)(x+7)", "4a⁴+3a²b²+b⁴=(2a²+ab+b²)(2a²-ab+b²)"] },
  { id: "g-mc-13", type: "mc", source: "공통수학1", text: "2x²+2y²+5xy-x+y-1의 인수인 것은?", options: ["2x+y+1", "2x+y-1", "2x-y-1", "x+2y+1", "x-2y-1"] },
  { id: "g-mc-14", type: "mc", source: "공통수학1", text: "1+i+i²+i³+⋯+i³⁰⁰을 간단히 하면?", options: ["-i", "-1", "0", "1", "i"] },
  { id: "g-mc-15", type: "mc", source: "공통수학1", text: "이차방정식 (x+4)(x-2)=-x(x+4)의 해는?", options: ["x=-4 또는 x=-1/2", "x=-4 또는 x=1", "x=-1 또는 x=3", "x=-1/2 또는 x=3", "x=-1 또는 x=4"] },
  { id: "g-mc-16", type: "mc", source: "공통수학1", text: "이차방정식 2x²-1=(x-3)(x+1)의 해는?", options: ["-1±i", "1±i", "(-1±i)/2", "(1±i)/2", "(2±i)/2"] },
  { id: "g-mc-17", type: "mc", source: "공통수학1", text: "[2018년 3월 고2 문과 9번 변형] -1≤x≤5에서 정의된 이차함수 f(x)=x²-8x+k의 최댓값이 20일 때, 이차함수 f(x)의 최솟값은? (단, k는 상수이다.)", options: ["-4", "-5", "-6", "-7", "-8"] },
  { id: "g-mc-18", type: "mc", source: "공통수학1", text: "x에 대한 다항식 f(x)를 (x-1)²으로 나누었을 때의 나머지는 x+2이고, x-2로 나누었을 때의 나머지는 3이다. f(x)를 (x-1)²(x-2)로 나누었을 때의 나머지는?", options: ["-x²-3x+1", "-x²+3x-1", "-x²+3x+1", "x²-3x-1", "x²+3x-1"] },
  { id: "g-mc-19", type: "mc", source: "공통수학1", text: "x에 대한 이차식 x²-2(k+2a)x+(k+2)²+4a²-b-1이 k의 값에 관계없이 완전제곱식이 되는 상수 a, b에 대하여 a+b의 값은?", options: ["4", "3", "2", "1", "0"] },
  { id: "g-mc-20", type: "mc", source: "공통수학1", text: "이차함수 y=f(x)가 다음 조건을 모두 만족할 때, f(2)의 값은?\n(가) 모든 실수 x에 대하여 f(1-x)=f(1+x)이다.\n(나) 0≤x≤3에서 f(x)의 최댓값은 4이고 최솟값은 0이다.\n(다) 함수 y=f(x)의 그래프는 점 (1,-1)을 지나는 직선과 항상 만난다.", options: ["0", "1", "2", "3", "4"] },
  { id: "g-subj-1", type: "subj", source: "공통수학1", text: "자연수 n⁴+n²-2가 (n-1)(n-2)의 배수가 되도록 하는 3 이상의 자연수 n의 값의 합을 구하시오." },
  { id: "g-subj-2", type: "subj", source: "공통수학1", text: "50 이하의 두 자연수 m, n에 대하여 {i^{n}+(1/i)^{2n}}^{m}의 값이 음의 실수가 되도록 하는 순서쌍 (m, n)의 개수를 구하시오. (단, i=√-1이다.)" },
  { id: "g-subj-3", type: "subj", source: "공통수학1", text: "이차함수 y=(x-a)²의 그래프와 직선 y=4x+b가 접하도록 하는 모든 실수 a, b (b≠0)에 대하여 x에 대한 이차함수\ny = {(-12a-8)/b}x² + (20a/b)x + (12-12a)/b\n의 그래프가 항상 지나는 두 점을 P₁, P₂라고 하자. 두 점 P₁, P₂를 지나는 직선을 x축 또는 y축의 방향으로 평행이동시킨 직선과 이차함수 y=(x+2)²의 그래프가 접하는 점을 Q(p, q)라 할 때, p+q의 값을 구하시오. (단, p, q는 실수이다.)" },
  { id: "g-subj-4", type: "subj", source: "공통수학1", text: "t≥0인 실수 t에 대하여 t≤x≤t+3에서 이차함수 f(x)=x²-4tx+10t의 최댓값과 최솟값의 합을 g(t)라 하자. t에 대한 방정식 g(t)=-4t+a의 서로 다른 실근의 개수가 4가 되도록 하는 모든 실수 a의 값의 범위는 p<a<q이다. 4p+7q의 값을 구하시오. (단, p와 q는 상수이다.)" },
  { id: "g-subj-5", type: "subj", source: "공통수학1", text: "자연수 n에 대하여 두 수 A, B를 A=n⁴+2n³+n²+2n+2, B=3n+1이라 하자. 예를 들어 n=2이면 A=42, B=7이므로 A는 B의 배수이다. n=3이면 A=152, B=10이므로 A는 B의 배수가 아니다. 이때, 3<n<50인 자연수 n에 대하여 A가 B의 배수가 되도록 하는 모든 자연수 n의 값의 합을 구하시오." },

  { id: "d-mc-1", type: "mc", source: "대수", text: "^{4}√(16·9)^{2}의 값은?", options: ["12", "18", "24", "36", "54"] },
  { id: "d-mc-2", type: "mc", source: "대수", text: "5^{3/2}·5^{-1/2}의 값은?", options: ["1/5", "1", "√5", "5", "5√5"] },
  { id: "d-mc-3", type: "mc", source: "대수", text: "3^{x}=5^{y}=15인 실수 x, y에 대하여 1/x+1/y의 값은?", options: ["1", "2", "5/2", "5", "10"] },
  { id: "d-mc-4", type: "mc", source: "대수", text: "log_{(x+2)}5의 값이 존재하기 위한 x의 값의 범위는?", options: ["-2<x≤-1, x>-1", "-2<x<-1, x≥-1", "-2<x<-1, x>-1", "-2<x<1, x>2", "-2<x<2, x≥3"] },
  { id: "d-mc-5", type: "mc", source: "대수", text: "함수 y=5^{x}의 그래프가 다음 그림과 같을 때 실수 a, b에 대하여 ab의 값은? (단, 점선은 x축 또는 y축에 평행하다.) [그래프: 곡선 y=5^{x} 위의 점 (2, a), (b, 125)]", options: ["65", "70", "75", "80", "85"] },
  { id: "d-mc-6", type: "mc", source: "대수", text: "함수 y=4^{x-a}+b의 그래프가 점 (1,1)을 지나고, 그래프의 점근선이 y=-3일 때, 상수 a, b의 합 a+b의 값은?", options: ["-5", "-4", "-3", "-2", "-1"] },
  { id: "d-mc-7", type: "mc", source: "대수", text: "정의역이 {x|1≤x≤3}인 함수 y=3^{x+2}-1의 최댓값과 최솟값의 합은?", options: ["262", "264", "266", "268", "270"] },
  { id: "d-mc-8", type: "mc", source: "대수", text: "로그함수 y=log₃x에 대한 다음 설명 중 옳지 않은 것은?", options: ["정의역은 양의 실수 전체의 집합이고, 치역은 실수 전체의 집합이다.", "그래프가 점 (1,0)을 지난다.", "그래프의 점근선은 x축이다.", "x의 값이 증가하면 y의 값도 증가한다.", "y=log₃x의 그래프는 y=3^{x}의 그래프와 직선 y=x에 대하여 대칭이다."] },
  { id: "d-mc-9", type: "mc", source: "대수", text: "방정식 3^{x+2}=1/243을 만족시키는 실수 x의 값을 구하면?", options: ["-7", "-6", "-5", "-4", "-3"] },
  { id: "d-mc-10", type: "mc", source: "대수", text: "방정식 36^{x}-3·6^{x}+6=0의 두 근을 α, β라 할 때, α+β의 값은?", options: ["1", "2", "3", "4", "5"] },
  { id: "d-mc-11", type: "mc", source: "대수", text: "지수부등식 8^{x}≤2^{x+4}을 만족시키는 모든 자연수 x의 값의 합은?", options: ["3", "6", "10", "15", "21"] },
  { id: "d-mc-12", type: "mc", source: "대수", text: "log_{x}81=2를 만족하는 x의 값은?", options: ["3", "9", "12", "13", "81"] },
  { id: "d-mc-13", type: "mc", source: "대수", text: "부등식 (log₅x)²+2log₅x-3≥0의 해는?", options: ["x≤1/125", "0<x≤1/125", "x≥5", "0<x≤1/125 또는 x≥5", "0<x≤1/5 또는 x≥125"] },
  { id: "d-mc-14", type: "mc", source: "대수", text: "다음 중 각을 나타내는 동경이 845°를 나타내는 동경과 일치하지 않는 것은?", options: ["125°", "-590°", "485°", "-235°", "1205°"] },
  { id: "d-mc-15", type: "mc", source: "대수", text: "다음 중 각을 나타내는 동경이 제3사분면에 존재하는 것은?", options: ["5π/4", "π/4", "5π/3", "-π/6", "-π/3"] },
  { id: "d-mc-16", type: "mc", source: "대수", text: "각 θ를 나타내는 동경과 각 6θ를 나타내는 동경이 서로 일치할 때 각 θ의 크기는? (단, π/2<θ<π)", options: ["5π/8", "5π/6", "3π/4", "2π/3", "4π/5"] },
  { id: "d-mc-17", type: "mc", source: "대수", text: "반지름의 길이가 2이고 중심각의 크기가 π/6인 부채꼴의 넓이는?", options: ["π/6", "π/3", "π/2", "2π/3", "5π/6"] },
  { id: "d-mc-18", type: "mc", source: "대수", text: "[2023년 11월 고2 14번/4점] 자연수 n(n≥2)에 대하여 m-2n의 n제곱근 중에서 실수인 것의 개수를 f(n)이라 할 때, f(2)+f(3)+f(4)=3을 만족시키는 모든 자연수 m의 값의 합은?", options: ["18", "23", "28", "33", "38"] },
  { id: "d-mc-19", type: "mc", source: "대수", text: "[2024년 6월 고2 17번/4점] 그림과 같이 상수 k(5<k<6)에 대하여 직선 y=-x+k가 두 곡선 y=-log₃x+4, y=3^{-x+4}과 만나는 네 점을 x좌표가 작은 점부터 차례로 A, B, C, D라 하자. AD-BC=4√2일 때, k의 값은? [그래프 있음]", options: ["19/4+log₃2", "17/4+2log₃2", "17/4+log₃5", "9/4+2log₃2", "9/2+log₃5"] },
  { id: "d-mc-20", type: "mc", source: "대수", text: "[2019년 9월 고2 문과 20번/4점] 그림과 같이 길이가 2인 선분 AB를 지름으로 하고 중심이 O인 반원이 있다. 호 AB 위에 점 P를 cos(∠BAP)=4/5가 되도록 잡는다. 부채꼴 OBP에 내접하는 원의 반지름의 길이가 r₁, 호 AP를 이등분하는 점과 선분 AP의 중점을 지름의 양 끝점으로 하는 원의 반지름의 길이가 r₂일 때, r₁r₂의 값은? [그림 있음]", options: ["3/40", "1/10", "1/8", "3/20", "7/40"] },
  { id: "d-subj-1", type: "subj", source: "대수", text: "2≤n≤100인 자연수 n에 대하여 ^{12}√n이 어떤 자연수의 2n제곱근이 되도록 하는 n의 개수를 구하시오." },
  { id: "d-subj-2", type: "subj", source: "대수", text: "정수 n에 대하여 f(n)=2n²+an+b가 다음 조건을 만족시킨다. (단, a, b는 상수이다.)\n(가) {f(2)}³-f(2)≠0\n(나) log₇{f(n)}^{2n-4}=0이 성립하는 서로 다른 정수 n은 4개 존재하며 그 값의 합은 26이다.\nlog₇f(n)=1이 성립하는 모든 정수 n의 값의 곱을 구하시오." },
  { id: "d-subj-3", type: "subj", source: "대수", text: "자연수 k에 대하여 직선 y=(1/k)(x-1)과 함수 y=log_{a}x의 그래프가 2≤x≤4에서 만나도록 하는 1보다 큰 자연수 a의 개수를 f(k)라 하자. f(k)≥5를 만족시키는 k의 최솟값을 구하시오." },
  { id: "d-subj-4", type: "subj", source: "대수", text: "좌표평면에서 다음 조건을 만족시키는 삼각형 ABC 중 두 함수 y=log₂x, y=log₅x의 그래프와 만나는 것의 개수를 구하시오.\n(가) 삼각형의 한 변 AB의 길이가 2이고, 꼭짓점 C에서 선분 AB에 내린 수선의 길이가 1이다.\n(나) 선분 AB는 x축에 평행하고 BC=CA이다.\n(다) 꼭짓점의 x좌표, y좌표가 모두 자연수이다.\n(라) 꼭짓점의 x좌표는 모두 100 이하이다." },
  { id: "d-subj-5", type: "subj", source: "대수", text: "3^{20}은 n자리 자연수이고 가장 큰 자리의 숫자가 a이다. 이때, n+a의 값을 구하시오. (단, log₁₀2=0.3010, log₁₀3=0.4771로 계산한다.)" },

  { id: "s-subj-1", type: "subj", source: "수학Ⅰ", text: "[2013년 11월 고3 이과 25번/3점] 단면의 반지름의 길이가 R(R<1)인 원기둥 모양의 어느 급수관에 물이 가득 차 흐르고 있다. 이 급수관의 단면의 중심에서의 물의 속력을 v_{c}, 급수관의 벽면으로부터 중심 방향으로 x (0<x≤R)만큼 떨어진 지점에서의 물의 속력을 v라 하면 다음과 같은 관계식이 성립한다고 한다.\n\nv_{c}/v = 1 - k·log(x/R)\n\n(단, k는 양의 상수이고, 길이의 단위는 m, 속력의 단위는 m/초이다.)\nR<1인 이 급수관의 벽면으로부터 중심 방향으로 R^{27/23}만큼 떨어진 지점에서의 물의 속력이 중심에서의 물의 속력의 1/2일 때, 급수관의 벽면으로부터 중심 방향으로 R^{a}만큼 떨어진 지점에서의 물의 속력이 중심에서의 물의 속력의 1/3이다. 23a의 값을 구하시오." },
  { id: "s-subj-2", type: "subj", source: "수학Ⅰ", text: "[2021년 3월 고3 17번/3점] 모든 실수 x에 대하여 이차부등식 3x²-2(log₂n)x+log₂n>0이 성립하도록 하는 자연수 n의 개수를 구하시오." },
];

const SEED_ORDER = SEED_PROBLEMS.map((p) => p.id);

/* ---------------- pagination: mirrors the printed paper exactly ----------------
   Every sheet holds up to 4 problems, laid out 2 columns × 2 rows
   (left-top, left-bottom, right-top, right-bottom), the same way the
   reference paper is laid out. This function is the single source of
   truth used both by the printable paper and by the ordering screen,
   so what you see while reordering is exactly what prints. */
function buildSheets(problems, sortMode, pageBreak) {
  const CHUNK = 4;
  const chunk4 = (arr) => {
    const out = [];
    for (let i = 0; i < arr.length; i += CHUNK) out.push(arr.slice(i, i + CHUNK));
    return out;
  };
  const sheets = [];
  if (sortMode === "auto") {
    const mcList = problems.filter((p) => p.type === "mc");
    const subjList = problems.filter((p) => p.type === "subj");
    if (pageBreak) {
      chunk4(mcList).forEach((items, idx) => {
        sheets.push({ items, startNumber: idx * CHUNK + 1, sectionLabel: null });
      });
      chunk4(subjList).forEach((items, idx) => {
        sheets.push({
          items,
          startNumber: mcList.length + idx * CHUNK + 1,
          sectionLabel: idx === 0 ? "【주관식】" : null,
        });
      });
    } else {
      const combined = [...mcList, ...subjList];
      chunk4(combined).forEach((items, idx) => {
        sheets.push({ items, startNumber: idx * CHUNK + 1, sectionLabel: null });
      });
    }
  } else {
    chunk4(problems).forEach((items, idx) => {
      sheets.push({ items, startNumber: idx * CHUNK + 1, sectionLabel: null });
    });
  }
  return sheets;
}

/* ---------------- reusable problem form ---------------- */
function ProblemForm({ initial, onSubmit, onCancel, submitLabel, allowContinue }) {
  const [type, setType] = useState(initial?.type || "mc");
  const [source, setSource] = useState(initial?.source || "");
  const [text, setText] = useState(initial?.text || "");
  const [options, setOptions] = useState(
    initial?.options && initial.options.length ? initial.options : ["", ""]
  );
  const [continueAdding, setContinueAdding] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const canSubmit = text.trim().length > 0 && (type !== "mc" || options.filter((o) => o.trim()).length >= 2);

  function updateOption(i, val) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? val : o)));
  }
  function addOption() {
    if (options.length < 8) setOptions((prev) => [...prev, ""]);
  }
  function removeOption(i) {
    setOptions((prev) => prev.filter((_, idx) => idx !== i));
  }
  function applyBulkOptions() {
    const lines = bulkText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 8);
    if (lines.length >= 2) {
      setOptions(lines);
      setBulkMode(false);
      setBulkText("");
    }
  }
  function wrapSelection(markStart, markEnd, placeholder) {
    const ta = textareaRef.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    const value = ta.value;
    const selected = value.slice(s, e) || placeholder;
    const newValue = value.slice(0, s) + markStart + selected + markEnd + value.slice(e);
    setText(newValue);
    requestAnimationFrame(() => {
      ta.focus();
      const cs = s + markStart.length;
      ta.setSelectionRange(cs, cs + selected.length);
    });
  }
  function resetForNext() {
    setText("");
    setOptions(["", ""]);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function submit() {
    if (!canSubmit) return;
    onSubmit({
      id: initial?.id || uid(type),
      type,
      source: source.trim(),
      text: text.trim(),
      options: type === "mc" ? options.filter((o) => o.trim().length > 0) : undefined,
    });
    if (continueAdding && allowContinue) {
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1400);
      resetForNext();
    }
  }

  function handleKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="form-card" onKeyDown={handleKeyDown}>
      <div className="form-row">
        <label className="radio-group">
          <input type="radio" checked={type === "mc"} onChange={() => setType("mc")} /> 객관식
        </label>
        <label className="radio-group">
          <input type="radio" checked={type === "subj"} onChange={() => setType("subj")} /> 서술형(주관식)
        </label>
        <input
          className="tag-input"
          placeholder="구분 태그 (예: 공통수학1) — 선택"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        />
      </div>

      <div className="mini-toolbar">
        <button type="button" onClick={() => wrapSelection("^{", "}", "내용")}>
          x²
        </button>
        <button type="button" onClick={() => wrapSelection("_{", "}", "내용")}>
          x₂
        </button>
        <span className="hint-text">선택한 부분을 위·아래 첨자로 감싸줘요 · ⌘/Ctrl+Enter로 바로 저장</span>
      </div>
      <textarea
        ref={textareaRef}
        className="text-input"
        placeholder="문제 내용을 입력하세요. 위 첨자는 ^{내용}, 아래 첨자는 _{내용} 형식으로 쓰면 미리보기에 반영됩니다. 예: x^{2}, log_{2}n"
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      {type === "mc" && (
        <div className="options-editor">
          <div className="options-editor-head">
            <button type="button" className="link-btn" onClick={() => setBulkMode((v) => !v)}>
              {bulkMode ? "개별 입력으로 전환" : "여러 줄 한번에 붙여넣기"}
            </button>
          </div>
          {bulkMode ? (
            <div className="bulk-box">
              <textarea
                className="text-input"
                rows={5}
                placeholder={"보기를 한 줄에 하나씩 붙여넣으세요. 예)\n10x²+4xy-3y²\n10x²+3y²\n-10x²-3y²"}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
              />
              <button type="button" className="btn ghost" onClick={applyBulkOptions}>
                보기에 적용
              </button>
            </div>
          ) : (
            <>
              {options.map((opt, i) => (
                <div key={i} className="option-row">
                  <span className="circled">{CIRCLED[i]}</span>
                  <input
                    className="option-input"
                    value={opt}
                    placeholder={`보기 ${i + 1}`}
                    onChange={(e) => updateOption(i, e.target.value)}
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      className="icon-btn danger"
                      onClick={() => removeOption(i)}
                      title="보기 삭제"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {options.length < 8 && (
                <button type="button" className="link-btn" onClick={addOption}>
                  + 보기 추가
                </button>
              )}
            </>
          )}
        </div>
      )}

      <div className="form-actions">
        {allowContinue && (
          <label className="continue-check">
            <input
              type="checkbox"
              checked={continueAdding}
              onChange={(e) => setContinueAdding(e.target.checked)}
            />
            저장 후 계속 추가
          </label>
        )}
        {savedFlash && <span className="status-msg">추가되었습니다.</span>}
        <button type="button" className="btn ghost" onClick={onCancel}>
          취소
        </button>
        <button type="button" className="btn primary" disabled={!canSubmit} onClick={submit}>
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

/* ---------------- insert-at modal ---------------- */
function InsertModal({ problems, examOrder, onPickExisting, onCreateNew, onClose }) {
  const [mode, setMode] = useState("pick");
  const [search, setSearch] = useState("");
  const [checked, setChecked] = useState({});

  const available = problems.filter(
    (p) => !examOrder.includes(p.id) && plainPreview(p.text, 200).toLowerCase().includes(search.toLowerCase())
  );

  function toggle(id) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function confirmPick() {
    const ids = Object.keys(checked).filter((id) => checked[id]);
    if (ids.length === 0) return;
    onPickExisting(ids);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-tabs">
          <button className={mode === "pick" ? "modal-tab active" : "modal-tab"} onClick={() => setMode("pick")}>
            문제은행에서 선택
          </button>
          <button className={mode === "new" ? "modal-tab active" : "modal-tab"} onClick={() => setMode("new")}>
            새 문제 만들기
          </button>
          <button className="icon-btn" onClick={onClose} title="닫기">
            ✕
          </button>
        </div>

        {mode === "pick" ? (
          <div className="modal-body">
            <input
              className="tag-input"
              style={{ width: "100%", marginBottom: 10 }}
              placeholder="문제 내용 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="pick-list">
              {available.length === 0 && <div className="empty-note">추가할 수 있는 문제가 없습니다.</div>}
              {available.map((p) => (
                <label key={p.id} className="pick-row">
                  <input type="checkbox" checked={!!checked[p.id]} onChange={() => toggle(p.id)} />
                  <span className={`badge ${p.type === "mc" ? "badge-mc" : "badge-subj"}`}>
                    {p.type === "mc" ? "객관식" : "서술형"}
                  </span>
                  {p.source && <span className="badge badge-tag">{p.source}</span>}
                  <span className="pick-text">{plainPreview(p.text)}</span>
                </label>
              ))}
            </div>
            <div className="form-actions">
              <button className="btn ghost" onClick={onClose}>
                취소
              </button>
              <button className="btn primary" onClick={confirmPick}>
                선택한 문제 삽입
              </button>
            </div>
          </div>
        ) : (
          <div className="modal-body">
            <ProblemForm onCancel={onClose} submitLabel="만들어서 삽입" onSubmit={onCreateNew} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- main app ---------------- */
export default function App() {
  const [problems, setProblems] = useState(SEED_PROBLEMS);
  const [examOrder, setExamOrder] = useState(SEED_ORDER);
  const [examTitle, setExamTitle] = useState("고등학교 수학 문제 모음 (편집용)");
  const [examSubtitle, setExamSubtitle] = useState("정답/해설 제외 · 편집용 문제지");
  const [sortMode, setSortMode] = useState("auto"); // 'auto' | 'manual'
  const [pageBreak, setPageBreak] = useState(true);
  const [tab, setTab] = useState("bank");
  const [loaded, setLoaded] = useState(false);

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [addingNew, setAddingNew] = useState(false);
  const [insertAt, setInsertAt] = useState(null); // index or null
  const [copyStatus, setCopyStatus] = useState("");
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const previewRef = useRef(null);

  // load (browser localStorage, so this works on a normal deployed website)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("exam-builder-state");
      if (raw) {
        const data = JSON.parse(raw);
        if (Array.isArray(data.problems) && data.problems.length) setProblems(data.problems);
        if (Array.isArray(data.examOrder)) setExamOrder(data.examOrder);
        if (typeof data.examTitle === "string") setExamTitle(data.examTitle);
        if (typeof data.examSubtitle === "string") setExamSubtitle(data.examSubtitle);
        if (data.sortMode) setSortMode(data.sortMode);
        if (typeof data.pageBreak === "boolean") setPageBreak(data.pageBreak);
      }
    } catch (e) {
      /* no saved state yet, or storage unavailable */
    }
    setLoaded(true);
  }, []);

  // save (debounced)
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      try {
        const payload = JSON.stringify({ problems, examOrder, examTitle, examSubtitle, sortMode, pageBreak });
        window.localStorage.setItem("exam-builder-state", payload);
      } catch (e) {
        /* storage full or unavailable */
      }
    }, 500);
    return () => clearTimeout(t);
  }, [problems, examOrder, examTitle, examSubtitle, sortMode, pageBreak, loaded]);

  const examSet = new Set(examOrder);

  function addToBank(problem) {
    setProblems((prev) => [...prev, problem]);
  }
  function updateInBank(id, updated) {
    setProblems((prev) => prev.map((p) => (p.id === id ? { ...updated, id } : p)));
  }
  function deleteFromBank(id) {
    if (!window.confirm("이 문제를 문제은행과 시험지에서 완전히 삭제할까요?")) return;
    setProblems((prev) => prev.filter((p) => p.id !== id));
    setExamOrder((prev) => prev.filter((eid) => eid !== id));
  }
  function duplicateInBank(p) {
    const copy = { ...p, id: uid(p.type), options: p.options ? [...p.options] : undefined };
    addToBank(copy);
    setEditingId(copy.id);
  }
  function addToExam(id, atIndex = null) {
    setExamOrder((prev) => {
      if (prev.includes(id)) return prev;
      if (atIndex === null) return [...prev, id];
      const next = [...prev];
      next.splice(atIndex, 0, id);
      return next;
    });
  }
  function addManyToExam(ids, atIndex) {
    setExamOrder((prev) => {
      const filtered = ids.filter((id) => !prev.includes(id));
      const next = [...prev];
      next.splice(atIndex, 0, ...filtered);
      return next;
    });
  }
  function removeFromExam(index) {
    setExamOrder((prev) => prev.filter((_, i) => i !== index));
  }
  function moveInExam(index, dir) {
    setExamOrder((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }
  function reorderDrop(targetIndex) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    setExamOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setDragIndex(null);
    setDragOverIndex(null);
  }

  function handleInsertPick(ids) {
    addManyToExam(ids, insertAt);
    setInsertAt(null);
  }
  function handleInsertNew(problem) {
    addToBank(problem);
    addManyToExam([problem.id], insertAt);
    setInsertAt(null);
  }

  async function copyRich() {
    try {
      const node = previewRef.current;
      if (!node) return;
      const html = `<div>${node.innerHTML}</div>`;
      const text = node.innerText;
      if (navigator.clipboard && window.ClipboardItem) {
        const item = new window.ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" }),
        });
        await navigator.clipboard.write([item]);
        setCopyStatus("복사되었습니다. 워드 문서에 붙여넣기 하세요.");
      } else {
        const range = document.createRange();
        range.selectNodeContents(node);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand("copy");
        sel.removeAllRanges();
        setCopyStatus("복사되었습니다. 워드 문서에 붙여넣기 하세요.");
      }
    } catch (e) {
      setCopyStatus("복사에 실패했습니다. 미리보기 내용을 직접 드래그해 선택한 뒤 복사해주세요.");
    }
    setTimeout(() => setCopyStatus(""), 4000);
  }

  const filteredBank = problems.filter((p) => {
    if (filterType !== "all" && p.type !== filterType) return false;
    if (search && !plainPreview(p.text, 500).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const orderedExamProblems = examOrder.map((id) => problems.find((p) => p.id === id)).filter(Boolean);

  const css = `
    * { box-sizing: border-box; }
    .app { --accent-blue:#1d4fc4; font-family: '맑은 고딕','Malgun Gothic',-apple-system,sans-serif; background:#f2f1ec; min-height:100vh; color:#1f2a3c; }
    .app-header { background:#1f2a3c; color:#fff; padding:18px 24px; }
    .app-header h1 { margin:0 0 4px; font-size:18px; font-weight:700; letter-spacing:-0.01em; }
    .title-row { display:flex; gap:10px; flex-wrap:wrap; margin-top:10px; }
    .title-input, .subtitle-input { background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.25); color:#fff; border-radius:4px; padding:8px 10px; font-size:14px; }
    .title-input { flex:1; min-width:260px; font-weight:600; }
    .subtitle-input { flex:2; min-width:260px; }
    .title-input::placeholder, .subtitle-input::placeholder { color:rgba(255,255,255,0.55); }
    .tabs { display:flex; gap:2px; background:#fff; border-bottom:1px solid #dcdad2; padding:0 24px; }
    .tab-btn { padding:14px 16px; background:none; border:none; font-size:14px; font-weight:600; color:#6b7280; cursor:pointer; border-bottom:2px solid transparent; }
    .tab-btn.active { color:#1f2a3c; border-bottom-color:#2f5d8c; }
    main { max-width:920px; margin:0 auto; padding:22px 24px 60px; }
    .toolbar { display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-bottom:16px; }
    .search-input { flex:1; min-width:180px; padding:9px 12px; border:1px solid #dcdad2; border-radius:4px; font-size:14px; background:#fff; }
    .select-input { padding:9px 10px; border:1px solid #dcdad2; border-radius:4px; font-size:14px; background:#fff; }
    .btn { padding:9px 16px; border-radius:4px; font-size:14px; font-weight:600; cursor:pointer; border:1px solid transparent; }
    .btn.primary { background:#2f5d8c; color:#fff; }
    .btn.primary:disabled { background:#a9b7c6; cursor:not-allowed; }
    .btn.ghost { background:#fff; color:#1f2a3c; border-color:#dcdad2; }
    .btn.danger-outline { background:#fff; color:#b23a3a; border-color:#e3b8b8; }
    .icon-btn { background:none; border:none; cursor:pointer; font-size:15px; color:#6b7280; padding:4px 6px; border-radius:4px; }
    .icon-btn:hover { background:#f0efe9; }
    .icon-btn.danger:hover { background:#fbeaea; color:#b23a3a; }
    .link-btn { background:none; border:none; color:#2f5d8c; font-size:13px; font-weight:600; cursor:pointer; padding:6px 0; }
    .bank-row { background:#fff; border:1px solid #e6e4dc; border-radius:4px; padding:12px 14px; margin-bottom:8px; display:flex; align-items:flex-start; gap:10px; }
    .row-main { flex:1; min-width:0; }
    .row-text { font-size:14px; line-height:1.5; color:#1f2a3c; }
    .row-actions { display:flex; gap:4px; flex-shrink:0; align-items:center; }
    .badge { display:inline-block; font-size:11px; font-weight:700; padding:2px 7px; border-radius:3px; margin-right:6px; vertical-align:middle; }
    .badge-mc { background:#eef2f7; color:#2f5d8c; }
    .badge-subj { background:#f6efe4; color:#8a5a20; }
    .badge-tag { background:#eef1ea; color:#4b5d4e; }
    .empty-state { text-align:center; padding:60px 20px; color:#8a8f98; }
    .empty-state .btn { margin-top:14px; }
    .form-card { background:#fff; border:1px solid #dcdad2; border-radius:6px; padding:16px; margin-bottom:16px; }
    .form-row { display:flex; gap:14px; align-items:center; margin-bottom:10px; flex-wrap:wrap; }
    .radio-group { font-size:14px; display:flex; align-items:center; gap:5px; }
    .tag-input { padding:8px 10px; border:1px solid #dcdad2; border-radius:4px; font-size:13px; flex:1; min-width:180px; }
    .mini-toolbar { display:flex; align-items:center; gap:6px; margin-bottom:8px; flex-wrap:wrap; }
    .mini-toolbar button { font-size:12px; padding:4px 9px; border:1px solid #dcdad2; border-radius:4px; background:#f7f6f2; cursor:pointer; font-weight:700; color:#2f5d8c; }
    .mini-toolbar button:hover { background:#eef2f7; }
    .mini-toolbar .hint-text { font-size:11.5px; color:#98a0ab; margin-left:2px; }
    .text-input { width:100%; padding:10px; border:1px solid #dcdad2; border-radius:4px; font-size:14px; line-height:1.5; margin-bottom:10px; font-family:inherit; resize:vertical; }
    .options-editor { margin-bottom:10px; }
    .options-editor-head { margin-bottom:4px; }
    .bulk-box { margin-bottom:6px; }
    .option-row { display:flex; align-items:center; gap:8px; margin-bottom:6px; }
    .circled { font-size:14px; width:18px; text-align:center; }
    .option-input { flex:1; padding:7px 9px; border:1px solid #dcdad2; border-radius:4px; font-size:13px; }
    .form-actions { display:flex; align-items:center; justify-content:flex-end; gap:8px; margin-top:6px; flex-wrap:wrap; }
    .continue-check { font-size:12.5px; color:#4b5460; display:flex; align-items:center; gap:5px; margin-right:auto; }
    .drag-handle { cursor:grab; color:#b8b6ac; font-size:15px; padding-top:1px; user-select:none; }
    .insert-bar { display:flex; align-items:center; gap:8px; margin:4px 0; opacity:0.55; }
    .insert-bar:hover { opacity:1; }
    .insert-line { flex:1; border-top:1px dashed #c7c5ba; }
    .insert-btn { font-size:12px; background:#fff; border:1px dashed #b6c6d8; color:#2f5d8c; border-radius:12px; padding:3px 10px; cursor:pointer; font-weight:600; }
    .modal-backdrop { position:fixed; inset:0; background:rgba(20,20,20,0.45); display:flex; align-items:center; justify-content:center; z-index:50; padding:20px; }
    .modal { background:#fff; border-radius:8px; width:100%; max-width:560px; max-height:82vh; display:flex; flex-direction:column; overflow:hidden; }
    .modal-tabs { display:flex; border-bottom:1px solid #e6e4dc; align-items:center; }
    .modal-tab { flex:1; padding:14px; background:none; border:none; font-size:14px; font-weight:700; color:#8a8f98; cursor:pointer; border-bottom:2px solid transparent; }
    .modal-tab.active { color:#1f2a3c; border-bottom-color:#2f5d8c; }
    .modal-body { padding:16px; overflow-y:auto; }
    .pick-list { max-height:340px; overflow-y:auto; border:1px solid #eee; border-radius:4px; }
    .pick-row { display:flex; align-items:center; gap:8px; padding:9px 10px; border-bottom:1px solid #f0efe9; font-size:13px; cursor:pointer; }
    .pick-row:hover { background:#f7f6f2; }
    .pick-text { flex:1; color:#1f2a3c; }
    .empty-note { padding:20px; text-align:center; color:#8a8f98; font-size:13px; }
    .controls-row { display:flex; gap:18px; align-items:center; flex-wrap:wrap; margin-bottom:16px; font-size:13px; color:#4b5460; }
    .controls-row label { display:flex; align-items:center; gap:6px; }

    /* ---- page-grouped ordering screen ---- */
    .page-group { border:1px dashed #cdcbc0; border-radius:8px; padding:14px 14px 10px; margin-bottom:6px; background:#fbfaf6; }
    .page-group-label { display:flex; justify-content:space-between; align-items:baseline; font-size:12px; font-weight:700; color:#6b7280; margin-bottom:10px; }
    .page-group-hint { font-size:11px; font-weight:600; color:#a9b7c6; }
    .page-mini-grid { display:grid; grid-template-columns:1fr 1fr; grid-auto-flow:column; grid-template-rows:repeat(2, auto); gap:8px; position:relative; }
    .page-mini-grid::before { content:""; position:absolute; top:-2px; bottom:-2px; left:50%; width:1px; background:#e2e0d6; }
    .mini-cell { background:#fff; border:1px solid #e6e4dc; border-radius:4px; padding:9px 10px; display:flex; align-items:flex-start; gap:8px; cursor:grab; }
    .mini-cell.drag-over { border-color:#2f5d8c; box-shadow:0 0 0 2px rgba(47,93,140,0.18); }
    .num-badge { flex-shrink:0; width:22px; height:22px; border-radius:50%; background:var(--accent-blue); color:#fff; font-size:11px; font-weight:800; display:flex; align-items:center; justify-content:center; margin-top:1px; }
    .mini-cell .row-actions { margin-left:auto; }

    /* ---- printable paper: styled after a real exam sheet ---- */
    .paper-wrap { display:flex; flex-direction:column; align-items:center; }
    .sheet { position:relative; background:#fff; width:100%; max-width:820px; min-height:1120px; margin:0 auto 30px; padding:52px 58px 66px; box-shadow:0 2px 14px rgba(0,0,0,0.08); border:1px solid #e2e0d6; font-family:'바탕','Batang','Nanum Myeongjo',serif; }
    .sheet-head-main h2 { font-size:24px; font-weight:800; color:var(--accent-blue); margin:0 0 6px; letter-spacing:-0.01em; }
    .sheet-head-main .head-sub { font-size:13px; color:#6b7280; margin-bottom:18px; }
    .sheet-info-row { display:flex; gap:10px; font-size:13px; color:#374151; padding-bottom:14px; border-bottom:1px solid #d8d6cc; margin-bottom:28px; }
    .sheet-info-row .dot { color:#c8c6bc; }
    .sheet-head-run { display:flex; justify-content:space-between; align-items:baseline; border-bottom:1px solid #e2e0d6; padding-bottom:8px; margin-bottom:28px; }
    .sheet-head-run .run-title { font-weight:800; color:var(--accent-blue); font-size:13px; }
    .sheet-head-run .run-sub { font-size:11.5px; color:#8a8f98; }
    .section-label { font-weight:800; font-size:14.5px; border-bottom:2px solid #1f2a3c; padding-bottom:8px; margin-bottom:24px; }
    .q-grid { display:grid; grid-template-columns:1fr 1fr; grid-auto-flow:column; grid-template-rows:repeat(2, auto); column-gap:48px; row-gap:32px; position:relative; }
    .q-grid::before { content:""; position:absolute; top:0; bottom:0; left:50%; width:1px; background:#e2e0d6; }
    .q { position:relative; padding-left:30px; min-height:400px; }
    .q-num { position:absolute; left:0; top:1px; font-weight:800; color:var(--accent-blue); font-size:16px; }
    .q-body { font-size:14.5px; line-height:1.75; color:#1f2a3c; }
    .opt-flow { display:flex; flex-wrap:wrap; column-gap:26px; row-gap:8px; margin-top:12px; }
    .opt-item { font-size:14px; }
    .sheet-footer { position:absolute; left:0; right:0; bottom:24px; text-align:center; font-size:12px; color:#a3a7b0; }
    .status-msg { font-size:13px; color:#3c7a5c; }
    @media print {
      @page { size: A4; margin: 12mm; }
      .no-print { display:none !important; }
      main { padding:0; max-width:none; }
      .sheet { box-shadow:none; border:none; max-width:none; width:auto; min-height:auto; margin:0; padding:0; }
      .sheet:not(:last-child) { page-break-after: always; }
      .paper-wrap { display:block; }
      .app { background:#fff; }
    }
  `;

  return (
    <div className="app">
      <style>{css}</style>

      <header className="app-header no-print">
        <h1>문제 출제 도구</h1>
        <div className="title-row">
          <input
            className="title-input"
            value={examTitle}
            onChange={(e) => setExamTitle(e.target.value)}
            placeholder="시험지 제목"
          />
          <input
            className="subtitle-input"
            value={examSubtitle}
            onChange={(e) => setExamSubtitle(e.target.value)}
            placeholder="부제 / 범위"
          />
        </div>
      </header>

      <nav className="tabs no-print">
        <button className={tab === "bank" ? "tab-btn active" : "tab-btn"} onClick={() => setTab("bank")}>
          문제은행 ({problems.length})
        </button>
        <button className={tab === "builder" ? "tab-btn active" : "tab-btn"} onClick={() => setTab("builder")}>
          시험지 구성 ({examOrder.length})
        </button>
        <button className={tab === "preview" ? "tab-btn active" : "tab-btn"} onClick={() => setTab("preview")}>
          미리보기 · 출력
        </button>
      </nav>

      <main>
        {tab === "bank" && (
          <div>
            <div className="toolbar">
              <input
                className="search-input"
                placeholder="문제 내용 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select className="select-input" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="all">전체 유형</option>
                <option value="mc">객관식만</option>
                <option value="subj">서술형만</option>
              </select>
              <button className="btn primary" onClick={() => setAddingNew((v) => !v)}>
                {addingNew ? "닫기" : "+ 새 문제 추가"}
              </button>
            </div>

            {addingNew && (
              <ProblemForm
                submitLabel="문제은행에 추가"
                allowContinue
                onCancel={() => setAddingNew(false)}
                onSubmit={(p) => {
                  addToBank(p);
                }}
              />
            )}

            {filteredBank.length === 0 && !addingNew && (
              <div className="empty-state">조건에 맞는 문제가 없습니다.</div>
            )}

            {filteredBank.map((p) =>
              editingId === p.id ? (
                <ProblemForm
                  key={p.id}
                  initial={p}
                  submitLabel="수정 저장"
                  onCancel={() => setEditingId(null)}
                  onSubmit={(updated) => {
                    updateInBank(p.id, updated);
                    setEditingId(null);
                  }}
                />
              ) : (
                <div className="bank-row" key={p.id}>
                  <div className="row-main">
                    <span className={`badge ${p.type === "mc" ? "badge-mc" : "badge-subj"}`}>
                      {p.type === "mc" ? "객관식" : "서술형"}
                    </span>
                    {p.source && <span className="badge badge-tag">{p.source}</span>}
                    <div className="row-text">{plainPreview(p.text)}</div>
                  </div>
                  <div className="row-actions">
                    <button
                      className="btn ghost"
                      disabled={examSet.has(p.id)}
                      onClick={() => addToExam(p.id)}
                      style={{ fontSize: 12, padding: "6px 10px" }}
                    >
                      {examSet.has(p.id) ? "포함됨" : "+ 시험지에 추가"}
                    </button>
                    <button className="icon-btn" title="복제해서 새로 만들기" onClick={() => duplicateInBank(p)}>
                      ⧉
                    </button>
                    <button className="icon-btn" title="수정" onClick={() => setEditingId(p.id)}>
                      ✎
                    </button>
                    <button className="icon-btn danger" title="삭제" onClick={() => deleteFromBank(p.id)}>
                      🗑
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {tab === "builder" && (
          <div>
            <div className="controls-row">
              <label>
                정렬 방식:
                <select className="select-input" value={sortMode} onChange={(e) => setSortMode(e.target.value)}>
                  <option value="auto">객관식 → 서술형 자동 정렬</option>
                  <option value="manual">내가 배치한 순서 그대로</option>
                </select>
              </label>
              <label style={{ opacity: sortMode === "auto" ? 1 : 0.4 }}>
                <input
                  type="checkbox"
                  checked={pageBreak}
                  disabled={sortMode !== "auto"}
                  onChange={(e) => setPageBreak(e.target.checked)}
                />
                서술형은 새 페이지에서 시작
              </label>
              {examOrder.length > 0 && (
                <button
                  className="btn danger-outline"
                  style={{ marginLeft: "auto", fontSize: 12, padding: "6px 12px" }}
                  onClick={() => {
                    if (window.confirm("시험지에서 모든 문제를 뺄까요? (문제은행에는 그대로 남습니다)")) {
                      setExamOrder([]);
                    }
                  }}
                >
                  시험지 비우기
                </button>
              )}
            </div>

            {examOrder.length === 0 ? (
              <div className="empty-state">
                아직 시험지에 문제가 없습니다.
                <br />
                <button className="btn primary" onClick={() => setInsertAt(0)}>
                  + 문제 추가하기
                </button>
              </div>
            ) : (
              (() => {
                const idToIndex = new Map(orderedExamProblems.map((p, i) => [p.id, i]));
                const sheets = buildSheets(orderedExamProblems, sortMode, pageBreak);
                const nodes = [];
                sheets.forEach((sheet, si) => {
                  const groupStart = idToIndex.get(sheet.items[0].id);
                  nodes.push(<InsertBar key={`ib-${si}`} onClick={() => setInsertAt(groupStart)} />);
                  nodes.push(
                    <div className="page-group" key={`pg-${si}`}>
                      <div className="page-group-label">
                        <span>
                          페이지 {si + 1} · {sheet.items.length}문제
                          {sheet.sectionLabel ? " · 주관식 시작" : ""}
                        </span>
                        <span className="page-group-hint">2×2 배치 (실제 인쇄와 동일)</span>
                      </div>
                      <div className="page-mini-grid">
                        {sheet.items.map((p, li) => {
                          const globalIndex = idToIndex.get(p.id);
                          const num = sheet.startNumber + li;
                          return (
                            <div
                              className={"mini-cell" + (dragOverIndex === globalIndex ? " drag-over" : "")}
                              key={p.id}
                              draggable
                              onDragStart={() => setDragIndex(globalIndex)}
                              onDragOver={(e) => {
                                e.preventDefault();
                                setDragOverIndex(globalIndex);
                              }}
                              onDragLeave={() => setDragOverIndex((v) => (v === globalIndex ? null : v))}
                              onDrop={() => reorderDrop(globalIndex)}
                            >
                              <span className="drag-handle" title="드래그해서 순서 변경">
                                ⠿
                              </span>
                              <span className="num-badge">{num}</span>
                              <div className="row-main">
                                <span className={`badge ${p.type === "mc" ? "badge-mc" : "badge-subj"}`}>
                                  {p.type === "mc" ? "객관식" : "서술형"}
                                </span>
                                {p.source && <span className="badge badge-tag">{p.source}</span>}
                                <div className="row-text">{plainPreview(p.text, 44)}</div>
                              </div>
                              <div className="row-actions">
                                <button className="icon-btn" title="위로" onClick={() => moveInExam(globalIndex, -1)}>
                                  ▲
                                </button>
                                <button className="icon-btn" title="아래로" onClick={() => moveInExam(globalIndex, 1)}>
                                  ▼
                                </button>
                                <button
                                  className="icon-btn danger"
                                  title="시험지에서 빼기"
                                  onClick={() => removeFromExam(globalIndex)}
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
                nodes.push(<InsertBar key="ib-end" onClick={() => setInsertAt(examOrder.length)} />);
                return nodes;
              })()
            )}
          </div>
        )}

        {tab === "preview" && (
          <div>
            <div className="toolbar no-print">
              <button className="btn ghost" onClick={() => window.print()}>
                🖨 인쇄 / PDF로 저장
              </button>
              <button className="btn primary" onClick={copyRich}>
                📋 서식 유지해서 복사 (워드에 붙여넣기)
              </button>
              {copyStatus && <span className="status-msg">{copyStatus}</span>}
            </div>

            <div className="paper-wrap">
              <ExamPaper
                ref={previewRef}
                title={examTitle}
                subtitle={examSubtitle}
                problems={orderedExamProblems}
                sortMode={sortMode}
                pageBreak={pageBreak}
              />
            </div>
          </div>
        )}
      </main>

      {insertAt !== null && (
        <InsertModal
          problems={problems}
          examOrder={examOrder}
          onClose={() => setInsertAt(null)}
          onPickExisting={handleInsertPick}
          onCreateNew={handleInsertNew}
        />
      )}
    </div>
  );
}

function InsertBar({ onClick }) {
  return (
    <div className="insert-bar">
      <div className="insert-line" />
      <button className="insert-btn" onClick={onClick}>
        + 여기에 문제 삽입
      </button>
      <div className="insert-line" />
    </div>
  );
}

const ExamPaper = forwardRef(function ExamPaper({ title, subtitle, problems, sortMode, pageBreak }, ref) {
  const sheets = buildSheets(problems, sortMode, pageBreak);

  return (
    <div ref={ref}>
      {sheets.length === 0 && <div className="empty-note">시험지 구성 탭에서 문제를 추가하면 여기에 표시됩니다.</div>}
      {sheets.map((sheet, si) => (
        <div className="sheet" key={si}>
          {si === 0 ? (
            <div className="sheet-head-main">
              <h2>{title}</h2>
              <div className="head-sub">{subtitle}</div>
              <div className="sheet-info-row">
                <span>{problems.length}문제</span>
                <span className="dot">|</span>
                <span>이름 ________________</span>
              </div>
            </div>
          ) : (
            <div className="sheet-head-run">
              <span className="run-title">{title}</span>
              <span className="run-sub">{subtitle}</span>
            </div>
          )}

          {sheet.sectionLabel && <div className="section-label">{sheet.sectionLabel}</div>}

          <div className="q-grid">
            {sheet.items.map((p, i) => (
              <QBlock key={p.id} num={sheet.startNumber + i} p={p} />
            ))}
          </div>

          <div className="sheet-footer">{si + 1}</div>
        </div>
      ))}
    </div>
  );
});

function QBlock({ num, p }) {
  return (
    <div className="q">
      <span className="q-num">{num}</span>
      <div className="q-body">
        {renderMath(p.text, `q-${p.id}`)}
        {p.options && (
          <div className="opt-flow">
            {p.options.map((opt, i) => (
              <span className="opt-item" key={i}>
                {CIRCLED[i]} {renderMath(opt, `o-${p.id}-${i}`)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
