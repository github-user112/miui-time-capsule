/* MIUI 时间胶囊 · 内容数据（粉丝自制怀旧互动，非小米官方发布） */
(function () {
  "use strict";

  var ERAS = [
    {
      year: "2010",
      version: "MIUI 1",
      title: "一切，从论坛开始",
      tagline: "每周五的更新，比周末还让人期待。",
      facts: ["第一个版本在社区发布，用户可以参与投票决定功能", "做了很多当时安卓没有的本土化小细节", "刷机、重启、再刷机，是那年的浪漫"],
      widget: { type: "dial", label: "复古拨号盘", hint: "点数字键，拨一通 2010 年的电话" },
      accent: "#ff8a3d", accent2: "#a83a00", glyph: "01"
    },
    {
      year: "2012",
      version: "MIUI 4",
      title: "你好，小米手机",
      tagline: "第一次把系统装进自己的手机里。",
      facts: ["小米手机一代发布，发烧友的圈子越来越大", "云服务让通讯录和照片有了第二个家", "主题商店里，换一套图标就像换台新机"],
      widget: { type: "cloud", label: "云同步", hint: "点一下，把照片送上 2012 年的云" },
      accent: "#ff7445", accent2: "#9c2c00", glyph: "02"
    },
    {
      year: "2014",
      version: "MIUI 6",
      title: "扁平化元年",
      tagline: "图标平了，心也跟着轻了。",
      facts: ["系统图标整体重绘，圆角和阴影被重新安排", "通知栏与多任务卡片化，信息一眼看完", "从拟物到扁平，是一次审美的集体转弯"],
      widget: { type: "icons", label: "图标风格", hint: "在拟物与扁平之间，一键穿越" },
      accent: "#ff9e2c", accent2: "#b24700", glyph: "03"
    },
    {
      year: "2016",
      version: "MIUI 8",
      title: "分身有术",
      tagline: "一个手机，两种生活。",
      facts: ["应用分身让工作与生活各住一层", "手机分身把隐私藏进另一个桌面", "长按图标拖动、整理，开始变得顺手"],
      widget: { type: "split", label: "手机分身", hint: "拖动滑块，看看桌面的另一面" },
      accent: "#ff7a59", accent2: "#8e2200", glyph: "04"
    },
    {
      year: "2018",
      version: "MIUI 10",
      title: "你好，小爱同学",
      tagline: "一句话，就能让手机忙起来。",
      facts: ["语音助手走进日常，动口不动手成为习惯", "全面屏手势替代三键导航，屏幕更完整", "AI 开始出现在天气、日历与相册里"],
      widget: {
        type: "assistant", label: "语音助手", hint: "点一下麦克风，听一句 2018 年的回应",
        replies: ["我在呢，今天也要好好生活。", "已为你规划：先喝水，再开会。", " locating… 开玩笑的，我在本地。", "晚安模式已开启，明早见。"]
      },
      accent: "#ff6b6b", accent2: "#8c1d18", glyph: "05"
    },
    {
      year: "2020",
      version: "MIUI 12",
      title: "把宇宙装进锁屏",
      tagline: "点亮屏幕，是一颗星球的 sunrise。",
      facts: ["超级壁纸让锁屏与桌面连续成一段动画", "隐私权限记录变得可见、可查", "深色模式与光感体验进一步打磨"],
      widget: {
        type: "wallpaper", label: "超级壁纸", hint: "换三张壁纸，看看锁屏怎么转起来",
        themes: [
          { name: "火星橙", a: "#ff8a3d", b: "#3b1200" },
          { name: "极夜蓝", a: "#4d7cff", b: "#08122f" },
          { name: "薄荷绿", a: "#3fd0a8", b: "#06251f" }
        ]
      },
      accent: "#ff9f43", accent2: "#6b2400", glyph: "06"
    },
    {
      year: "2022",
      version: "MIUI 13",
      title: "稳稳地，才走得远",
      tagline: "流畅与隐私，成了新的主角。",
      facts: ["系统稳定性与流畅度被反复打磨", "隐私与权限提醒更细致", "老机型也能获得更长的维护周期"],
      widget: { type: "privacy", label: "隐私守护", hint: "打开开关，看看权限都在做什么" },
      accent: "#ffb057", accent2: "#7a3300", glyph: "07"
    },
    {
      year: "2023",
      version: "HyperOS",
      title: "人车家，连成一张网",
      tagline: "手机不再是终点，而是入口。",
      facts: ["澎湃 OS 把手机、汽车与家居放进同一套体验", "设备之间可以互相调用能力", "互联从"+"“连接”"+"走向"+"“无感”"],
      widget: { type: "connected", label: "全生态连接", hint: "点亮三个节点，连起你的设备" },
      accent: "#ff7d33", accent2: "#6a1d00", glyph: "08"
    },
    {
      year: "2025",
      version: "HyperOS 3",
      title: "指尖上的新日常",
      tagline: "熟悉的橙色，藏进更细的动效里。",
      facts: ["锁屏与通知的交互细节继续演进", "跨设备协同更像"+"“一个系统”", "AI 能力融入更多日常场景"],
      widget: { type: "unlock", label: "指纹解锁", hint: "按住圆环，解锁新一天" },
      accent: "#ff8f2c", accent2: "#5c1c00", glyph: "09"
    },
    {
      year: "2026",
      version: "下一站",
      title: "未来胶囊，由你封存",
      tagline: "写一句话，留给几年后的自己。",
      facts: ["这句话只保存在当前设备的本地存储中", "不会上传，也不会被任何人读取", "你可以随时删除它"],
      widget: { type: "future", label: "写给未来", hint: "写一句话，存进这台设备的胶囊" },
      accent: "#ffc46b", accent2: "#6b4300", glyph: "10"
    }
  ];

  var QUIZ = [
    {
      id: "year",
      question: "你最早接触 MIUI 是哪一年？",
      options: [
        { label: "2010", value: 2010, sub: "元老级" },
        { label: "2012", value: 2012, sub: "小米手机一代" },
        { label: "2014", value: 2014, sub: "扁平化" },
        { label: "2016", value: 2016, sub: "分身时代" },
        { label: "2018", value: 2018, sub: "小爱同学" },
        { label: "2020", value: 2020, sub: "超级壁纸" },
        { label: "2023", value: 2023, sub: "HyperOS" },
        { label: "还没用过", value: 2026, sub: "未来可期" }
      ]
    },
    {
      id: "phone",
      question: "你的第一台小米手机是？",
      options: [
        { label: "小米手机 1", value: "小米手机 1" },
        { label: "小米 2 / 2S", value: "小米 2 系列" },
        { label: "小米 Note", value: "小米 Note" },
        { label: "小米 5", value: "小米 5" },
        { label: "小米 8", value: "小米 8" },
        { label: "小米 11", value: "小米 11" },
        { label: "小米 14", value: "小米 14" },
        { label: "还没入手", value: "观望中" }
      ]
    },
    {
      id: "feature",
      question: "你最怀念的功能是？",
      options: [
        { label: "主题商店", value: "主题商店" },
        { label: "云同步", value: "云同步" },
        { label: "应用分身", value: "应用分身" },
        { label: "小爱同学", value: "小爱同学" },
        { label: "超级壁纸", value: "超级壁纸" },
        { label: "全面屏手势", value: "全面屏手势" },
        { label: "每周五更新", value: "周五更新" },
        { label: "说不出来", value: "都是青春" }
      ]
    }
  ];

  function rankFor(year) {
    if (year <= 2011) return { name: "MIUI 元老", level: "LV.9 骨灰级", years: 2026 - year, desc: "从论坛时代一路走来，你见过它的第一行代码。" };
    if (year <= 2014) return { name: "早期探索者", level: "LV.8 老米粉", years: 2026 - year, desc: "刷机、抢购、等周五更新，你都经历过。" };
    if (year <= 2017) return { name: "进化见证者", level: "LV.7 资深米粉", years: 2026 - year, desc: "你见证了它从好看，变得好用。" };
    if (year <= 2020) return { name: "美学觉醒者", level: "LV.6 中坚米粉", years: 2026 - year, desc: "超级壁纸亮起的那一刻，你也跟着惊艳。" };
    if (year <= 2023) return { name: "生态玩家", level: "LV.5 新锐米粉", years: 2026 - year, desc: "人车家全生态，你是最早一批体验者。" };
    return { name: "未来可期", level: "LV.3 潜力米粉", years: 2026 - year, desc: "故事才刚开始，下一站由你书写。" };
  }

  window.CAPSULE_DATA = { eras: ERAS, quiz: QUIZ, rankFor: rankFor };
})();
