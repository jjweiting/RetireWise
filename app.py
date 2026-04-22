"""
RetireWise — 獨立退休規劃 Streamlit App

從個人資產管理系統的「退休規劃」分頁獨立出來，
所有輸入參數改為使用者手動輸入，不依賴外部資料檔案。

用法：
    streamlit run app.py
"""

import csv as csv_module
import datetime
import math
from pathlib import Path

import plotly.graph_objects as go
import streamlit as st
import pandas as pd

# ─── 頁面基本設定 ─────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="RetireWise 退休規劃",
    layout="wide",
    page_icon="🏖️",
    initial_sidebar_state="collapsed",
)

# ─── 路徑 ─────────────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent
PLANS_FILE = PROJECT_ROOT / "retirement_plans.csv"


# ─── 輔助函數 ─────────────────────────────────────────────────────────────────
def _fmt_money(value: float) -> str:
    """格式化金額為千分位字串（例如 6512059 → 6,512,059）"""
    return f"{value:,.0f}"


# ═════════════════════════════════════════════════════════════════════════════
# 主頁面
# ═════════════════════════════════════════════════════════════════════════════
st.title("🏖️ RetireWise 退休規劃試算")
st.caption("設定退休參數，即時試算財務自由年份、所需資產與退休後逐年資產走勢")

# ════════════════════════════════════════════════════════════════════
# 區塊 A：退休 / 財務自由計算機（同時顯示兩種模式）
# ════════════════════════════════════════════════════════════════════
st.subheader("🏖️ 退休 / 財務自由計算機")
st.caption(
    "📅 **指定月花費**：設定月花費 → 計算何時 FI、退休後資產走勢不動本金永久提領。　💀 **壽命規劃**：設定壽命目標 → 逆推最大可用月花費、資產剛好耗盡。"
)

# ── 計算基準：手動輸入（必填）────────────────────────────────────────────────
st.markdown("**計算基準（目前資產起點）**")
_fi_col_a, _fi_col_b = st.columns(2)
with _fi_col_a:
    _fi_current_base = st.number_input(
        "目前資產（元）",
        min_value=0,
        max_value=500_000_000,
        value=3_000_000,
        step=100_000,
        key="fi_current_base",
        help="輸入你目前的可投資資產或淨值，作為退休試算的起點。",
    )
with _fi_col_b:
    _fi_monthly_saving = st.number_input(
        "每月儲蓄 / 投入金額（元）",
        min_value=0,
        max_value=1_000_000,
        value=30_000,
        step=5_000,
        key="fi_monthly_saving",
        help="每個月固定投入的金額（薪水扣除生活費後的結餘）。用來預測退休前的資產累積速度。",
    )
_fi_base_label = f"手動輸入（NT${_fmt_money(_fi_current_base)}）"

# ── 共用參數 ──────────────────────────────────────────────────────────────────
st.markdown("**共用參數**")
_fi_c1, _fi_c4, _fi_c5, _fi_c6 = st.columns(4)
with _fi_c1:
    _fi_monthly_expense = st.slider(
        "每月目標生活費（元）",
        min_value=10_000,
        max_value=300_000,
        value=60_000,
        step=5_000,
        format="$%d",
        key="fi_monthly_expense",
        help="退休後每個月的目標花費。📅 模式直接用此值推算財務自由門檻；💀 模式以此作為通膨基礎，再逆推最大可用月花費。",
    )
with _fi_c4:
    _fi_pre_return = st.slider(
        "退休前年化報酬率",
        min_value=0.0,
        max_value=30.0,
        value=7.0,
        step=0.5,
        format="%.1f%%",
        key="fi_pre_return",
        help="退休前資產累積階段的預期年化報酬率，預設 7%（長期股市歷史平均）。",
    )
with _fi_c5:
    _fi_post_return = st.slider(
        "退休後年化報酬率",
        min_value=0.0,
        max_value=15.0,
        value=5.0,
        step=0.5,
        format="%.1f%%",
        key="fi_post_return",
        help="退休後資產保守配置的預期年化報酬率，通常低於退休前。",
    )
with _fi_c6:
    _fi_inflation = st.slider(
        "每年生活費通膨率",
        min_value=0.0,
        max_value=5.0,
        value=3.0,
        step=0.5,
        format="%.1f%%",
        key="fi_inflation",
        help="生活費每年因通膨增加的幅度，影響退休後每年實際花費與所需資產門檻。",
    )

_fi_la1, _fi_la2 = st.columns(2)
with _fi_la1:
    _fi_current_age = st.number_input(
        "目前年齡（歲）",
        min_value=1,
        max_value=100,
        value=32,
        step=1,
        key="fi_current_age",
        help="用來換算退休年齡、死亡年份。",
    )
with _fi_la2:
    _fi_death_age = st.number_input(
        "預期壽命（歲）",
        min_value=50,
        max_value=120,
        value=85,
        step=1,
        key="fi_death_age",
        help="兩個模式的圖表終點都以此為準，方便並排比較。",
    )

# ── 各模式專屬參數 ────────────────────────────────────────────────────────────
st.markdown("**各模式專屬參數**")
_fi_excl1, _fi_excl2 = st.columns(2)
with _fi_excl1:
    st.caption("📅 指定月花費專屬")
    _fi_withdrawal_rate = st.slider(
        "安全提領率",
        min_value=2.0,
        max_value=6.0,
        value=4.0,
        step=0.5,
        format="%.1f%%",
        key="fi_withdrawal_rate",
        help="4% 是最常見的安全提領率（三一研究）。代表每年從資產提領 4%，本金理論上永不耗盡。💀 壽命規劃模式不使用此參數。",
    )
with _fi_excl2:
    st.caption("💀 壽命規劃專屬")
    _fi_bequest = st.number_input(
        "死亡時目標剩餘（元）",
        min_value=0,
        max_value=100_000_000,
        value=0,
        step=500_000,
        key="fi_bequest",
        help="死亡時希望帳上還剩多少錢。填 0 代表剛好燒完；填正數代表想留下遺產給後代。📅 指定月花費模式不使用此參數。",
    )

_fi_pre_r = _fi_pre_return / 100
_fi_post_r_calc = _fi_post_return / 100
_fi_infl_r = _fi_inflation / 100
monthly_saving = _fi_monthly_saving


# ── 核心計算函數 ──────────────────────────────────────────────────────────────
def _calc_true_threshold_t8(monthly_exp_today, post_r, infl_r, years, bequest=0):
    """逆推：今天月花費 → 退休需要多少本金（考慮通膨年數）"""
    _a = float(bequest)
    for _i in range(int(years), 0, -1):
        _exp = monthly_exp_today * 12 * (1 + infl_r) ** (_i - 1)
        _a = (_a + _exp) / (1 + post_r)
    return _a


def _sim_final_asset(start, monthly_today, infl_r, post_r, years_retire, years_after):
    """給定退休起始資產，模擬到壽命，回傳最終資產"""
    monthly_at_retire = monthly_today * (1 + infl_r) ** years_retire
    asset = start
    for n in range(1, int(years_after) + 1):
        spend = monthly_at_retire * (1 + infl_r) ** (n - 1) * 12
        asset = asset * (1 + post_r) - spend
        if asset <= 0:
            return 0.0
    return asset


# --- 📅 指定月花費模式 ---
_fi4_years_to_retire = None
for _yn in range(1, 61):
    _fv = _fi_current_base * (1 + _fi_pre_r) ** _yn
    if monthly_saving > 0 and _fi_pre_r > 0:
        _fv += monthly_saving * 12 * ((1 + _fi_pre_r) ** _yn - 1) / _fi_pre_r
    _retire_age_est = _fi_current_age + _yn
    _years_after_est = max(_fi_death_age - _retire_age_est, 1)
    _lo, _hi = 0.0, 2e9
    for _ in range(50):
        _mid = (_lo + _hi) / 2
        _final = _sim_final_asset(
            _mid,
            _fi_monthly_expense,
            _fi_infl_r,
            _fi_post_r_calc,
            _yn,
            _years_after_est,
        )
        if _final >= _mid:
            _hi = _mid
        else:
            _lo = _mid
    _thr = _hi
    if _fv >= _thr:
        _fi4_years_to_retire = _yn
        break

_fi4_yrs = _fi4_years_to_retire or 30
_fi4_retire_yr = datetime.date.today().year + _fi4_yrs
_fi4_retire_age = _fi_current_age + _fi4_yrs
_fi4_death_year = datetime.date.today().year + (_fi_death_age - _fi_current_age)
_fi4_table_years = max(_fi_death_age - _fi4_retire_age, 1)
_fi4_plan_until = _fi4_retire_yr + _fi4_table_years

_lo, _hi = 0.0, 2e9
for _ in range(50):
    _mid = (_lo + _hi) / 2
    _final = _sim_final_asset(
        _mid,
        _fi_monthly_expense,
        _fi_infl_r,
        _fi_post_r_calc,
        _fi4_yrs,
        _fi4_table_years,
    )
    if _final >= _mid:
        _hi = _mid
    else:
        _lo = _mid
_fi4_required = _hi

_fi4_gap = max(_fi4_required - _fi_current_base, 0)
_fi4_progress = (
    min(_fi_current_base / _fi4_required * 100, 100) if _fi4_required > 0 else 0
)

# --- 💀 壽命規劃模式 ---
_filt_years_to_retire = None
for _yn in range(1, 61):
    _fv = _fi_current_base * (1 + _fi_pre_r) ** _yn
    if monthly_saving > 0 and _fi_pre_r > 0:
        _fv += monthly_saving * 12 * ((1 + _fi_pre_r) ** _yn - 1) / _fi_pre_r
    _fi_retire_age_est = _fi_current_age + _yn
    _fi_years_after_retire_est = max(_fi_death_age - _fi_retire_age_est, 1)
    _fi_threshold_adj = _calc_true_threshold_t8(
        _fi_monthly_expense,
        _fi_post_r_calc,
        _fi_infl_r,
        _fi_years_after_retire_est,
        _fi_bequest,
    )
    if _fv >= _fi_threshold_adj:
        _filt_years_to_retire = _yn
        break
_filt_yrs = _filt_years_to_retire or 30
_filt_retire_age = _fi_current_age + _filt_yrs
_filt_retire_yr = datetime.date.today().year + _filt_yrs
_filt_death_year = datetime.date.today().year + (_fi_death_age - _fi_current_age)
_filt_table_years = max(_fi_death_age - _filt_retire_age, 1)
_filt_required = _calc_true_threshold_t8(
    _fi_monthly_expense,
    _fi_post_r_calc,
    _fi_infl_r,
    _filt_table_years,
    _fi_bequest,
)
_filt_gap = max(_filt_required - _fi_current_base, 0)
_filt_progress = (
    min(_fi_current_base / _filt_required * 100, 100) if _filt_required > 0 else 0
)

# 向下相容（供儲存用）
_fi_yrs = _fi4_yrs
_fi_retire_yr = _fi4_retire_yr
_fi_retire_age = _fi4_retire_age
_fi_table_years = _fi4_table_years
_fi_plan_until = _fi4_plan_until
_fi_death_year = _fi4_death_year
_fi_required_at_retire = _fi4_required
_fi_years_to_retire_pure = _fi4_years_to_retire
_fi_gap = _fi4_gap
_fi_progress_pct = _fi4_progress
_fi_monthly_at_retire = _fi_monthly_expense * (1 + _fi_infl_r) ** _fi4_yrs

# ── Metric 摘要卡：兩模式並排 ────────────────────────────────────────────────
_fi_mc_left, _fi_mc_right = st.columns(2)

with _fi_mc_left:
    st.markdown(
        f"##### 📅 指定月花費（月花 NT${_fmt_money(_fi_monthly_expense)}，退休後持續正成長）"
    )
    _fi4_ma, _fi4_mb, _fi4_mc = st.columns(3)
    _fi4_monthly_at_retire = _fi_monthly_expense * (1 + _fi_infl_r) ** _fi4_yrs
    _fi4_ma.metric(
        "🎯 FI 門檻",
        f"NT${_fmt_money(_fi4_required)}",
        help=f"退休當年月花費 NT${_fmt_money(_fi4_monthly_at_retire)}，"
        f"以退休後報酬率 {_fi_post_return:.1f}%、通膨 {_fi_inflation:.1f}% 模擬到 {_fi_death_age} 歲，"
        f"確保資產持續正成長（壽命時剩餘 ≥ 起始資產）的最低退休本金。",
    )
    _fi4_mb.metric(
        "🏖️ FI 年份",
        f"{_fi4_retire_yr}（{_fi4_yrs}年後，{_fi4_retire_age}歲）"
        if _fi4_years_to_retire
        else "60年內無法達成",
    )
    _fi4_mc.metric(
        "📏 距目標還差",
        f"NT${_fmt_money(_fi4_gap)}",
        f"{_fi4_progress:.1f}% 已達成",
        delta_color="normal",
    )

with _fi_mc_right:
    _bequest_desc_hdr = (
        "剛好燒完" if _fi_bequest == 0 else f"留 NT${_fmt_money(_fi_bequest)}"
    )
    st.markdown(f"##### 💀 壽命規劃（活到 {_fi_death_age} 歲，{_bequest_desc_hdr}）")
    _filt_ma, _filt_mb, _filt_mc = st.columns(3)
    _filt_monthly_at_retire = _fi_monthly_expense * (1 + _fi_infl_r) ** _filt_yrs
    _filt_ma.metric(
        "🎯 FI 門檻",
        f"NT${_fmt_money(_filt_required)}",
        help=(
            f"退休後以 {_fi_post_return:.1f}% 報酬率、{_fi_inflation:.1f}% 通膨，"
            f"活 {int(_filt_table_years)} 年，死亡時剩 NT${_fmt_money(_fi_bequest)} 的逆推本金。"
        ),
    )
    _filt_mb.metric(
        "🏖️ FI 年份",
        f"{_filt_retire_yr}（{_filt_yrs}年後，{_filt_retire_age}歲）"
        if _filt_years_to_retire
        else "60年內無法達成",
    )
    _filt_mc.metric(
        "📏 距目標還差",
        f"NT${_fmt_money(_filt_gap)}",
        f"{_filt_progress:.1f}% 已達成",
        delta_color="normal",
    )

# ════════════════════════════════════════════════════════════════════
# 區塊 B：逐年試算（兩條曲線，各自起點，統一終點到壽命）
# ════════════════════════════════════════════════════════════════════
st.divider()
st.subheader("📋 逐年資產試算")

_fi_death_year_chart = datetime.date.today().year + (_fi_death_age - _fi_current_age)
_fi_post_r = _fi_post_return / 100

# ── 📅 模式退休年份固定為 FI 達成年份，💀 模式保留 slider ─────────────────────
_slider_col1, _slider_col2 = st.columns(2)
with _slider_col1:
    _fi4_retire_yr_display = datetime.date.today().year + (_fi4_years_to_retire or 30)
    st.info(
        f"📅 退休年份由系統決定：**{_fi4_retire_yr_display} 年**（{_fi4_years_to_retire or '60年內無法達成'} 年後，{_fi_current_age + (_fi4_years_to_retire or 30)} 歲）\n\n"
        f"起始資產固定為 FI 門檻 **NT${_fmt_money(_fi4_required)}**，確保資產永不歸零。"
    )
with _slider_col2:
    _filt_retire_year_input = st.slider(
        "💀 壽命規劃：預計退休年份",
        min_value=datetime.date.today().year,
        max_value=_fi_death_year_chart - 1,
        value=min(
            datetime.date.today().year + (_filt_years_to_retire or 10),
            _fi_death_year_chart - 1,
        ),
        step=1,
        key="filt_retire_year_input",
        help="設定💀壽命規劃模式的退休年份。越晚退休，起始資產越多，可逆推出更高的每月可用花費。",
    )


# ── 計算工具函數 ──────────────────────────────────────────────────────────────
def _calc_max_monthly_expense(start_asset, post_r, infl_r, years, bequest=0):
    _pv_bequest = float(bequest) / (1 + post_r) ** int(years)
    _denom = sum(
        12 * (1 + infl_r) ** (n - 1) / (1 + post_r) ** n
        for n in range(1, int(years) + 1)
    )
    if _denom <= 0:
        return 0.0
    return (float(start_asset) - _pv_bequest) / _denom


def _run_simulation(
    years,
    start_asset,
    monthly_exp_at_retire,
    infl_pct,
    post_r,
    retire_year,
    age_offset=None,
):
    rows = []
    asset = start_asset
    for n in range(1, int(years) + 1):
        monthly = monthly_exp_at_retire * (1 + infl_pct / 100) ** (n - 1)
        annual = monthly * 12
        inv_return = asset * post_r
        end_asset = asset + inv_return - annual
        row = {
            "年份": retire_year + n - 1,
            "月花費（元）": monthly,
            "年花費（元）": annual,
            "投資報酬（元）": max(inv_return, 0),
            "年末資產（元）": max(end_asset, 0),
            "耗盡": end_asset <= 0,
        }
        if age_offset is not None:
            row["年齡"] = f"{age_offset + n - 1} 歲"
        rows.append(row)
        asset = max(end_asset, 0)
    return pd.DataFrame(rows)


# ── 📅 模式：起始資產固定為 FI 門檻，從達到 FI 那年開始模擬 ────────────────────
_fi4_yrs_until = _fi4_years_to_retire or 30
_fi4_start_asset = _fi4_required
_fi4_retire_year_input = datetime.date.today().year + _fi4_yrs_until
_fi4_retire_age_chart = _fi_current_age + _fi4_yrs_until
_fi4_table_years_chart = max(_fi_death_age - _fi4_retire_age_chart, 1)
_fi4_plan_until_chart = _fi4_retire_year_input + _fi4_table_years_chart
_fi4_monthly_at_retire_chart = _fi_monthly_expense * (1 + _fi_infl_r) ** _fi4_yrs_until

# ── 💀 模式：各自計算起始資產，終點統一到壽命 ────────────────────────────────
_filt_yrs_until = max(0, _filt_retire_year_input - datetime.date.today().year)
_filt_start_asset = _fi_current_base * (1 + _fi_pre_r) ** _filt_yrs_until
if monthly_saving > 0 and _fi_pre_r > 0 and _filt_yrs_until > 0:
    _filt_start_asset += (
        monthly_saving * 12 * ((1 + _fi_pre_r) ** _filt_yrs_until - 1) / _fi_pre_r
    )
_filt_retire_age_chart = _fi_current_age + _filt_yrs_until
_filt_table_years_chart = max(_fi_death_age - _filt_retire_age_chart, 1)
_filt_valid = _filt_retire_age_chart < _fi_death_age

# 向下相容（供儲存區塊）
_fi_retire_year = _fi4_retire_year_input
_fi_retire_year_input = _fi4_retire_year_input
_fi_years_until_retire = _fi4_yrs_until
_fi_start_asset = _fi4_start_asset
_fi_plan_years = _fi4_table_years_chart

st.caption(
    f"📅 退休 {_fi4_retire_year_input} 年（{_fi4_retire_age_chart} 歲），起始資產 **NT${_fi4_start_asset:,.0f}**　｜　"
    f"💀 退休 {_filt_retire_year_input} 年（{_filt_retire_age_chart} 歲），起始資產 **NT${_filt_start_asset:,.0f}**　｜　"
    f"兩條曲線終點統一至 **{_fi_death_age} 歲（{_fi_death_year_chart} 年）**"
)

# ── 計算兩條曲線 ──────────────────────────────────────────────────────────────
_fi_df = _run_simulation(
    _fi4_table_years_chart,
    _fi4_start_asset,
    _fi4_monthly_at_retire_chart,
    _fi_inflation,
    _fi_post_return / 100,
    _fi4_retire_year_input,
    age_offset=_fi4_retire_age_chart,
)

if not _fi_df.empty and _fi_df["耗盡"].any():
    _fi4_depleted_yr = int(_fi_df[_fi_df["耗盡"]]["年份"].iloc[0])
    _fi4_depleted_age = _fi4_retire_age_chart + (
        _fi4_depleted_yr - _fi4_retire_year_input
    )
    _real_net_r = _fi_post_return - _fi_inflation
    st.warning(
        f"⚠️ **FI 門檻不足以支撐到 {_fi_death_age} 歲！**\n\n"
        f"以目前設定（退休後報酬率 {_fi_post_return:.1f}%，通膨 {_fi_inflation:.1f}%，"
        f"實際淨報酬 {_real_net_r:.1f}%），資產將在 **{_fi4_depleted_age} 歲（{_fi4_depleted_yr} 年）提前歸零**。\n\n"
        f"💡 解決方式：①提高「退休後年化報酬率」 ②降低「通膨率」假設 ③降低「安全提領率」（讓門檻更高）"
    )

_lt_df = pd.DataFrame()
_lt_monthly_expense = 0.0
if _filt_valid and _filt_table_years_chart > 0:
    _lt_monthly_expense = _calc_max_monthly_expense(
        _filt_start_asset,
        _fi_post_return / 100,
        _fi_infl_r,
        _filt_table_years_chart,
        _fi_bequest,
    )
    _lt_df = _run_simulation(
        _filt_table_years_chart,
        _filt_start_asset,
        _lt_monthly_expense,
        _fi_inflation,
        _fi_post_return / 100,
        _filt_retire_year_input,
        age_offset=_filt_retire_age_chart,
    )
else:
    st.warning(
        f"⚠️ 預期死亡年齡（{_fi_death_age} 歲）≤ 💀 預計退休年齡（{_filt_retire_age_chart} 歲），請調整退休年份。"
    )

# ── 說明文字：兩欄並排 ────────────────────────────────────────────────────────
_info_col1, _info_col2 = st.columns(2)
with _info_col1:
    _fi4_sim_asset = _fi4_start_asset
    for _sn in range(1, int(_fi4_table_years_chart) + 1):
        _sm4 = _fi4_monthly_at_retire_chart * (1 + _fi_infl_r) ** (_sn - 1)
        _fi4_sim_asset = (
            _fi4_sim_asset + _fi4_sim_asset * (_fi_post_return / 100) - _sm4 * 12
        )
    _fi4_sim_asset = max(_fi4_sim_asset, 0)
    st.info(
        f"**📅 指定月花費**\n\n"
        f"計算基準：{_fi_base_label}\n\n"
        f"月花費 NT${_fmt_money(_fi_monthly_expense)}，通膨 {_fi_inflation:.1f}%/年。\n\n"
        f"退休時月花費：NT${_fmt_money(_fi4_monthly_at_retire_chart)}\n\n"
        f"退休後報酬率 {_fi_post_return:.1f}%、通膨 {_fi_inflation:.1f}%，模擬到 {_fi_death_age} 歲資產持續正成長，FI 門檻 NT${_fmt_money(_fi4_required)}。\n\n"
        f"目前達成 **{_fi4_progress:.1f}%**，還差 NT${_fmt_money(_fi4_gap)}。\n\n"
        f"退休起始資產 NT${_fmt_money(_fi4_start_asset)}，模擬至 {_fi_death_age} 歲，"
        f"**{_fi_death_age} 歲時預估剩餘 NT${_fmt_money(_fi4_sim_asset)}**。"
    )
with _info_col2:
    if not _lt_df.empty:
        _bequest_desc = (
            "剛好燒完（剩 NT$0）"
            if _fi_bequest == 0
            else f"留下 NT${_fmt_money(_fi_bequest)} 遺產"
        )
        _real_r = _fi_post_return - _fi_inflation
        _crossover_note = (
            f"\n\n⚠️ 實際報酬（{_fi_post_return:.1f}%-{_fi_inflation:.1f}%）={_real_r:.1f}%，門檻可能偏高。"
            if _real_r < 2.0
            else ""
        )
        st.info(
            f"**💀 壽命規劃**\n\n"
            f"計算基準：{_fi_base_label}\n\n"
            f"規劃活到 **{_fi_death_age} 歲**（{int(_filt_table_years_chart)} 年），目標{_bequest_desc}。\n\n"
            f"FI 門檻 NT${_fmt_money(_filt_required)}。\n\n"
            f"目前達成 **{_filt_progress:.1f}%**，還差 NT${_fmt_money(_filt_gap)}。\n\n"
            f"退休起始資產 NT${_fmt_money(_filt_start_asset)}，"
            f"逆推最大可用月花費：**NT${_lt_monthly_expense:,.0f}**。" + _crossover_note
        )
    else:
        st.warning("💀 壽命規劃：請調整退休年份使退休年齡小於預期壽命。")

# ── Metric 補充：兩模式對稱比較 ──────────────────────────────────────────────
_mc2_a, _mc2_b, _mc2_c, _mc2_d = st.columns(4)
_mc2_a.metric(
    "📅 退休起始資產",
    f"NT${_fi4_start_asset:,.0f}",
    delta=f"{_fi4_retire_year_input} 年（{_fi4_retire_age_chart} 歲）退休",
)
_mc2_c.metric(
    "💀 退休起始資產",
    f"NT${_filt_start_asset:,.0f}",
    delta=f"{_filt_retire_year_input} 年（{_filt_retire_age_chart} 歲）退休",
)

if not _fi_df.empty:
    _fi4_depleted = _fi_df["耗盡"].any()
    if _fi4_depleted:
        _fi4_dep_yr = int(_fi_df[_fi_df["耗盡"]]["年份"].iloc[0])
        _mc2_b.metric(
            f"📅 {_fi_death_age}歲剩餘",
            "NT$0（提前耗盡）",
            delta=f"⚠️ {_fi4_dep_yr} 年資產歸零",
            delta_color="inverse",
        )
    else:
        _fi4_final = _fi_df["年末資產（元）"].iloc[-1]
        _mc2_b.metric(
            f"📅 {_fi_death_age}歲剩餘",
            f"NT${_fi4_final:,.0f}",
            delta=f"月花 NT${_fi4_monthly_at_retire_chart:,.0f}（退休當年），資產仍存在",
            delta_color="normal",
            help=f"每月花 NT${_fmt_money(_fi_monthly_expense)}（今日幣值），以 {_fi_withdrawal_rate:.1f}% 提領率不動本金，"
            f"{_fi_death_age} 歲時帳上預估剩餘。",
        )

if not _lt_df.empty:
    _lt_final = _lt_df["年末資產（元）"].iloc[-1]
    _mc2_d.metric(
        f"💀 {_fi_death_age}歲剩餘",
        f"NT${_lt_final:,.0f}",
        delta=f"月花 NT${_lt_monthly_expense:,.0f}（退休當年），目標 NT${_fmt_money(_fi_bequest)}",
        delta_color="normal",
        help=f"逆推最大可用月花費 NT${_lt_monthly_expense:,.0f}，{_fi_death_age} 歲時帳上剩餘（目標 NT${_fmt_money(_fi_bequest)}）。",
    )

# ── 圖表（兩條曲線，X 軸統一到壽命年份）─────────────────────────────────────
_combined_fig = go.Figure()

if not _fi_df.empty:
    _combined_fig.add_trace(
        go.Scatter(
            x=_fi_df["年份"],
            y=_fi_df["年末資產（元）"],
            mode="lines+markers",
            name=f"📅 資產走勢（月花{_fi4_monthly_at_retire_chart:,.0f}，不動本金）",
            line=dict(color="#00CC96", width=2),
            hovertemplate="年份：%{x}<br>年末資產：$%{y:,.0f}<extra></extra>",
        )
    )
    _combined_fig.add_trace(
        go.Scatter(
            x=_fi_df["年份"],
            y=_fi_df["年花費（元）"],
            mode="lines",
            name="📅 年花費",
            line=dict(color="#00CC96", width=1.5, dash="dash"),
            hovertemplate="年份：%{x}<br>年花費：$%{y:,.0f}<extra></extra>",
            visible="legendonly",
        )
    )

if not _lt_df.empty:
    _combined_fig.add_trace(
        go.Scatter(
            x=_lt_df["年份"],
            y=_lt_df["年末資產（元）"],
            mode="lines+markers",
            name=f"💀 資產走勢（月花{_lt_monthly_expense:,.0f}，花至壽命）",
            line=dict(color="#636EFA", width=2),
            hovertemplate="年份：%{x}<br>年末資產：$%{y:,.0f}<extra></extra>",
        )
    )
    _combined_fig.add_trace(
        go.Scatter(
            x=_lt_df["年份"],
            y=_lt_df["年花費（元）"],
            mode="lines",
            name="💀 年花費",
            line=dict(color="#636EFA", width=1.5, dash="dash"),
            hovertemplate="年份：%{x}<br>年花費：$%{y:,.0f}<extra></extra>",
            visible="legendonly",
        )
    )

_combined_fig.add_vline(
    x=_fi_death_year_chart,
    line_dash="dot",
    line_color="#ff6b6b",
    annotation_text=f"壽命終點 {_fi_death_age}歲（{_fi_death_year_chart}年）",
    annotation_position="top right",
)
_combined_fig.add_vline(
    x=_fi4_retire_year_input,
    line_dash="dot",
    line_color="#00CC96",
    annotation_text=f"📅 退休 {_fi4_retire_age_chart}歲",
    annotation_position="bottom right",
)
_combined_fig.add_vline(
    x=_filt_retire_year_input,
    line_dash="dot",
    line_color="#636EFA",
    annotation_text=f"💀 退休 {_filt_retire_age_chart}歲",
    annotation_position="bottom left",
)

_combined_fig.update_layout(
    title=f"退休後資產走勢：📅 指定月花費 vs 💀 壽命規劃（終點統一至 {_fi_death_age} 歲）",
    xaxis_title="年份",
    yaxis_title="金額（元）",
    hovermode="x unified",
    height=500,
    plot_bgcolor="#0e1117",
    paper_bgcolor="#0e1117",
    font_color="#fafafa",
    yaxis=dict(tickformat=",.0f"),
    legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
)
st.plotly_chart(_combined_fig, use_container_width=True, key="fi_combined_chart")

# ── 逐年明細表格（兩個 tab）──────────────────────────────────────────────────
with st.expander("📊 查看逐年明細表格", expanded=False):
    _detail_tab1, _detail_tab2 = st.tabs(["📅 指定月花費", "💀 壽命規劃"])
    with _detail_tab1:
        if not _fi_df.empty:
            st.caption(
                f"退休 {_fi4_retire_year_input} 年（{_fi4_retire_age_chart} 歲），"
                f"規劃至 {_fi_death_age} 歲（{_fi4_plan_until_chart} 年，共 {_fi4_table_years_chart} 年）"
                f"｜退休當年月花費 NT${_fi4_monthly_at_retire_chart:,.0f}"
            )
            _fi_display = _fi_df.copy()
            for _col in [
                "月花費（元）",
                "年花費（元）",
                "投資報酬（元）",
                "年末資產（元）",
            ]:
                _fi_display[_col] = _fi_display[_col].apply(lambda v: f"${v:,.0f}")
            st.dataframe(
                _fi_display.drop(columns=["耗盡"]),
                use_container_width=True,
                hide_index=True,
            )
    with _detail_tab2:
        if not _lt_df.empty:
            st.caption(
                f"退休 {_filt_retire_year_input} 年（{_filt_retire_age_chart} 歲），"
                f"規劃至 {_fi_death_age} 歲（{_fi_death_year_chart} 年，共 {int(_filt_table_years_chart)} 年）"
                f"｜逆推最大月花費：NT${_lt_monthly_expense:,.0f}"
                f"｜目標剩餘：NT${_fmt_money(_fi_bequest)}"
            )
            _lt_display = _lt_df.copy()
            for _col in [
                "月花費（元）",
                "年花費（元）",
                "投資報酬（元）",
                "年末資產（元）",
            ]:
                _lt_display[_col] = _lt_display[_col].apply(lambda v: f"${v:,.0f}")
            st.dataframe(
                _lt_display.drop(columns=["耗盡"]),
                use_container_width=True,
                hide_index=True,
            )
        else:
            st.info("請調整退休年份使退休年齡小於預期壽命。")

# ════════════════════════════════════════════════════════════════════
# 區塊 C：下載 PDF 報告
# ════════════════════════════════════════════════════════════════════
st.divider()
st.subheader("📄 下載退休規劃報告")


def _generate_retirement_pdf():
    from weasyprint import HTML as _WP_HTML

    _today = datetime.date.today()
    _fi4_end_asset_str = (
        "提前耗盡"
        if (_fi_df.empty or _fi_df["耗盡"].any())
        else f"NT${_fi_df['年末資產（元）'].iloc[-1]:,.0f}"
    )
    _lt_end_asset_str = (
        "—" if _lt_df.empty else f"NT${_lt_df['年末資產（元）'].iloc[-1]:,.0f}"
    )
    _lt_monthly_str = "—" if _lt_df.empty else f"NT${_lt_monthly_expense:,.0f}"

    def _df_to_html(df, drop_col="耗盡"):
        if df.empty:
            return "<p>無資料</p>"
        _d = df.copy()
        if drop_col in _d.columns:
            _d = _d.drop(columns=[drop_col])
        for _c in ["月花費（元）", "年花費（元）", "投資報酬（元）", "年末資產（元）"]:
            if _c in _d.columns:
                _d[_c] = _d[_c].apply(lambda v: f"NT${v:,.0f}")
        rows = "".join(
            f"<tr>{''.join(f'<td>{v}</td>' for v in row)}</tr>"
            for row in _d.itertuples(index=False)
        )
        headers = "".join(f"<th>{c}</th>" for c in _d.columns)
        return f"<table><thead><tr>{headers}</tr></thead><tbody>{rows}</tbody></table>"

    _fi4_table_html = _df_to_html(_fi_df)
    _lt_table_html = _df_to_html(_lt_df)
    _bequest_str = "剛好燒完（NT$0）" if _fi_bequest == 0 else f"NT${_fi_bequest:,.0f}"

    _html = f"""
<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<style>
  body {{ font-family: sans-serif; font-size: 13px; color: #222; margin: 30px 40px; }}
  h1   {{ font-size: 20px; color: #1a5276; border-bottom: 2px solid #1a5276; padding-bottom: 6px; }}
  h2   {{ font-size: 15px; color: #1a5276; margin-top: 24px; border-left: 4px solid #1a5276; padding-left: 8px; }}
  .meta {{ color: #666; font-size: 11px; margin-bottom: 16px; }}
  .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 12px 0; }}
  .card {{ background: #f4f6f8; border-radius: 6px; padding: 12px 16px; }}
  .card .label {{ font-size: 11px; color: #666; }}
  .card .value {{ font-size: 16px; font-weight: bold; color: #1a5276; margin-top: 2px; }}
  .card .sub   {{ font-size: 11px; color: #888; margin-top: 2px; }}
  table {{ width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 8px; }}
  th    {{ background: #1a5276; color: #fff; padding: 5px 8px; text-align: right; }}
  th:first-child {{ text-align: left; }}
  td    {{ padding: 4px 8px; border-bottom: 1px solid #e0e0e0; text-align: right; }}
  td:first-child {{ text-align: left; }}
  tr:nth-child(even) {{ background: #f9f9f9; }}
  .section {{ margin-top: 20px; }}
  .warn {{ color: #c0392b; font-weight: bold; }}
</style>
</head>
<body>
<h1>🏖️ 退休規劃報告</h1>
<p class="meta">產生時間：{_today}　｜　計算基準：{_fi_base_label}　｜　目前年齡：{_fi_current_age} 歲　｜　預期壽命：{_fi_death_age} 歲</p>

<h2>⚙️ 計算參數</h2>
<div class="grid">
  <div class="card"><div class="label">目前資產</div><div class="value">NT${_fi_current_base:,.0f}</div></div>
  <div class="card"><div class="label">每月儲蓄</div><div class="value">NT${monthly_saving:,.0f}</div></div>
  <div class="card"><div class="label">每月目標生活費</div><div class="value">NT${_fi_monthly_expense:,.0f}</div></div>
  <div class="card"><div class="label">退休前 / 後年化報酬率</div><div class="value">{_fi_pre_return:.1f}% / {_fi_post_return:.1f}%</div></div>
  <div class="card"><div class="label">每年通膨率</div><div class="value">{_fi_inflation:.1f}%</div></div>
  <div class="card"><div class="label">📅 安全提領率 ／ 💀 死亡目標剩餘</div><div class="value">{_fi_withdrawal_rate:.1f}% ／ {_bequest_str}</div></div>
</div>

<h2>📅 指定月花費 — 財務自由試算</h2>
<div class="grid">
  <div class="card"><div class="label">🎯 FI 門檻</div><div class="value">NT${_fi4_required:,.0f}</div><div class="sub">退休後資產持續正成長所需最低本金</div></div>
  <div class="card"><div class="label">🏖️ 預計 FI 年份</div><div class="value">{"60年內無法達成" if not _fi4_years_to_retire else f"{_fi4_retire_yr} 年（{_fi4_retire_age} 歲，{_fi4_yrs} 年後）"}</div></div>
  <div class="card"><div class="label">📏 距目標還差</div><div class="value">NT${_fi4_gap:,.0f}</div><div class="sub">{_fi4_progress:.1f}% 已達成</div></div>
  <div class="card"><div class="label">📊 {_fi_death_age} 歲時剩餘資產</div><div class="value">{_fi4_end_asset_str}</div></div>
</div>

<h2>💀 壽命規劃 — 逆推月花費</h2>
<div class="grid">
  <div class="card"><div class="label">🎯 FI 門檻</div><div class="value">NT${_filt_required:,.0f}</div><div class="sub">活到 {_fi_death_age} 歲，目標{_bequest_str} 的最低本金</div></div>
  <div class="card"><div class="label">🏖️ 預計 FI 年份</div><div class="value">{"60年內無法達成" if not _filt_years_to_retire else f"{_filt_retire_yr} 年（{_filt_retire_age} 歲，{_filt_yrs} 年後）"}</div></div>
  <div class="card"><div class="label">💰 逆推最大月花費</div><div class="value">{_lt_monthly_str}</div><div class="sub">退休當年可用月花費（含通膨遞增）</div></div>
  <div class="card"><div class="label">📊 {_fi_death_age} 歲時剩餘資產</div><div class="value">{_lt_end_asset_str}</div><div class="sub">目標：{_bequest_str}</div></div>
</div>

<div class="section">
<h2>📋 逐年明細：📅 指定月花費</h2>
<p>退休年份：{_fi4_retire_year_input} 年（{_fi4_retire_age_chart} 歲）　退休起始資產：NT${_fi4_start_asset:,.0f}　退休當年月花費：NT${_fi4_monthly_at_retire_chart:,.0f}</p>
{_fi4_table_html}
</div>

<div class="section">
<h2>📋 逐年明細：💀 壽命規劃</h2>
{"<p>退休年份：" + str(_filt_retire_year_input) + " 年（" + str(_filt_retire_age_chart) + " 歲）　退休起始資產：NT$" + f"{_filt_start_asset:,.0f}" + "　逆推最大月花費：NT$" + f"{_lt_monthly_expense:,.0f}" + "</p>" + _lt_table_html if not _lt_df.empty else "<p>無資料（退休年齡 ≥ 壽命）</p>"}
</div>

</body>
</html>
"""
    _pdf_bytes = _WP_HTML(string=_html).write_pdf()
    return _pdf_bytes


if st.button("📄 產生 PDF 報告", key="fi_gen_pdf", type="primary"):
    with st.spinner("產生 PDF 中..."):
        try:
            _pdf_data = _generate_retirement_pdf()
            st.download_button(
                label="⬇️ 下載退休規劃報告.pdf",
                data=_pdf_data,
                file_name=f"退休規劃報告_{datetime.date.today()}.pdf",
                mime="application/pdf",
                key="fi_download_pdf",
            )
            st.success("✅ PDF 已產生，點擊上方按鈕下載！")
        except Exception as _e:
            st.error(f"❌ PDF 產生失敗：{_e}")

# ════════════════════════════════════════════════════════════════════
# 區塊 D：儲存退休計劃
# ════════════════════════════════════════════════════════════════════
_fi_depleted_year = None
if not _fi_df.empty and _fi_df["耗盡"].any():
    _fi_depleted_year = int(_fi_df[_fi_df["耗盡"]]["年份"].iloc[0])
elif not _lt_df.empty and _lt_df["耗盡"].any():
    _fi_depleted_year = int(_lt_df[_lt_df["耗盡"]]["年份"].iloc[0])

with st.expander("💾 儲存此退休計劃", expanded=False):
    _fi_auto_name = (
        f"{_fi_retire_year_input}退休"
        f"｜月支{int(_fi_monthly_expense // 1000)}k"
        f"｜提領{_fi_withdrawal_rate:.1f}%"
        f"｜前{_fi_pre_return:.1f}%後{_fi_post_return:.1f}%"
        f"｜通膨{_fi_inflation:.1f}%"
        f"｜規劃至{_fi_plan_until}年"
        f"｜資產{int(_fi_current_base // 10000)}萬"
    )
    _fi_plan_name = st.text_input("計劃名稱", value=_fi_auto_name, key="fi_plan_name")
    if st.button("儲存計劃", key="fi_save_plan"):
        _fi_plan_file = PLANS_FILE
        _fi_need_header = True
        if _fi_plan_file.exists():
            with open(_fi_plan_file, "r", encoding="utf-8") as _fcheck:
                _first = _fcheck.readline().strip().split(",")[0].lstrip("\ufeff")
            _fi_need_header = not (_first == "計劃名稱")
        _fi_headers = [
            "計劃名稱",
            "儲存時間",
            "退休年份",
            "每月生活費",
            "通膨率%",
            "退休前報酬率%",
            "退休後報酬率%",
            "安全提領率%",
            "退休起始資產",
            "財務自由門檻",
            "耗盡年份",
            "顯示年數",
        ]
        _fi_plan_row = [
            _fi_plan_name,
            datetime.date.today().isoformat(),
            _fi_retire_year_input,
            _fi_monthly_expense,
            _fi_inflation,
            _fi_pre_return,
            _fi_post_return,
            _fi_withdrawal_rate,
            round(_fi_start_asset),
            round(_fi_required_at_retire),
            _fi_depleted_year if _fi_depleted_year else "未耗盡",
            int(_fi_table_years),
        ]
        with open(_fi_plan_file, "a", newline="", encoding="utf-8") as _fi_f:
            _fi_w = csv_module.writer(_fi_f)
            if _fi_need_header:
                _fi_w.writerow(_fi_headers)
            _fi_w.writerow(_fi_plan_row)
        st.success(f"✅ 已儲存計劃「{_fi_plan_name}」！")

# ════════════════════════════════════════════════════════════════════
# 區塊 D：比較已儲存計劃
# ════════════════════════════════════════════════════════════════════
st.divider()
st.subheader("📊 比較已儲存計劃")

_fi_compare_file = PLANS_FILE
if not _fi_compare_file.exists():
    st.info(
        "💡 尚未儲存任何退休計劃，請先點擊上方「💾 儲存此退休計劃」儲存至少一個計劃。"
    )
else:
    _fi_csv_headers = [
        "計劃名稱",
        "儲存時間",
        "退休年份",
        "每月生活費",
        "通膨率%",
        "退休前報酬率%",
        "退休後報酬率%",
        "安全提領率%",
        "退休起始資產",
        "財務自由門檻",
        "耗盡年份",
        "顯示年數",
    ]
    with open(_fi_compare_file, "r", encoding="utf-8") as _fh:
        _first_line = _fh.readline().strip().split(",")[0]
    _has_header = not _first_line.lstrip("\ufeff").replace(".", "").isdigit()
    _fi_plans_df = pd.read_csv(
        _fi_compare_file,
        encoding="utf-8",
        header=0 if _has_header else None,
        names=None if _has_header else _fi_csv_headers,
    )

    with st.expander("🗂️ 已儲存計劃一覽（點開可刪除）", expanded=False):
        st.dataframe(_fi_plans_df, use_container_width=True, hide_index=True)
        _fi_del_options = _fi_plans_df["計劃名稱"].tolist()
        _fi_del_target = st.selectbox(
            "選擇要刪除的計劃",
            options=["（不刪除）"] + _fi_del_options,
            key="fi_delete_select",
        )
        if _fi_del_target != "（不刪除）":
            if st.button(
                f"🗑️ 刪除「{_fi_del_target}」",
                key="fi_delete_btn",
                type="secondary",
            ):
                _fi_plans_df = _fi_plans_df[_fi_plans_df["計劃名稱"] != _fi_del_target]
                _fi_plans_df.to_csv(_fi_compare_file, index=False, encoding="utf-8")
                st.success(f"✅ 已刪除「{_fi_del_target}」")
                st.rerun()

    _fi_plan_options = _fi_plans_df["計劃名稱"].tolist()
    if not _fi_plan_options:
        st.info("目前沒有可比較的計劃。")
    else:
        _fi_selected_plans = st.multiselect(
            "📌 選擇要比較的計劃（可多選）",
            options=_fi_plan_options,
            default=_fi_plan_options[: min(len(_fi_plan_options), 3)],
            key="fi_compare_select",
        )

        if not _fi_selected_plans:
            st.info("請至少選擇一個計劃以顯示圖表。")
        else:
            _fi_compare_fig = go.Figure()
            for _fi_pname in _fi_selected_plans:
                _fi_prow = _fi_plans_df[_fi_plans_df["計劃名稱"] == _fi_pname].iloc[-1]
                _fi_p_start = float(_fi_prow["退休起始資產"])
                _fi_p_post_r = float(_fi_prow["退休後報酬率%"]) / 100
                _fi_p_inflation = float(_fi_prow["通膨率%"])
                _fi_p_monthly = float(_fi_prow["每月生活費"])
                _fi_p_retire_year = int(_fi_prow["退休年份"])
                _fi_p_years = int(_fi_prow["顯示年數"])
                _fi_p_asset = _fi_p_start
                _fi_p_years_list = []
                _fi_p_assets = []
                for _fi_pn in range(1, _fi_p_years + 1):
                    _fi_p_annual = (
                        _fi_p_monthly * 12 * (1 + _fi_p_inflation / 100) ** (_fi_pn - 1)
                    )
                    _fi_p_return = _fi_p_asset * _fi_p_post_r
                    _fi_p_end = _fi_p_asset + _fi_p_return - _fi_p_annual
                    _fi_p_years_list.append(_fi_p_retire_year + _fi_pn - 1)
                    _fi_p_assets.append(max(_fi_p_end, 0))
                    _fi_p_asset = max(_fi_p_end, 0)

                _fi_compare_fig.add_trace(
                    go.Scatter(
                        x=_fi_p_years_list,
                        y=_fi_p_assets,
                        mode="lines+markers",
                        name=f"{_fi_pname}（資產）",
                        hovertemplate=(
                            f"<b>{_fi_pname}</b><br>"
                            "年份：%{x}<br>"
                            "年末資產：$%{y:,.0f}<extra></extra>"
                        ),
                    )
                )

            _fi_compare_fig.update_layout(
                title="退休計劃比較：年末資產走勢",
                xaxis_title="年份",
                yaxis_title="金額（元）",
                hovermode="x unified",
                height=480,
                legend=dict(
                    orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1
                ),
            )
            st.plotly_chart(
                _fi_compare_fig, use_container_width=True, key="fi_compare_chart"
            )

            st.caption("📋 各計劃關鍵指標對照")
            _fi_summary_rows = []
            for _fi_pname in _fi_selected_plans:
                _fi_prow = _fi_plans_df[_fi_plans_df["計劃名稱"] == _fi_pname].iloc[-1]
                _fi_summary_rows.append(
                    {
                        "計劃名稱": _fi_pname,
                        "退休年份": int(_fi_prow["退休年份"]),
                        "每月生活費": f"NT${float(_fi_prow['每月生活費']):,.0f}",
                        "退休前報酬率": f"{float(_fi_prow['退休前報酬率%']):.1f}%",
                        "退休後報酬率": f"{float(_fi_prow['退休後報酬率%']):.1f}%",
                        "通膨率": f"{float(_fi_prow['通膨率%']):.1f}%",
                        "提領率": f"{float(_fi_prow['安全提領率%']):.1f}%",
                        "退休起始資產": f"NT${float(_fi_prow['退休起始資產']):,.0f}",
                        "資產耗盡年份": str(_fi_prow["耗盡年份"]),
                    }
                )
            st.dataframe(
                pd.DataFrame(_fi_summary_rows),
                use_container_width=True,
                hide_index=True,
            )
