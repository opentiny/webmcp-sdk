// 页面加载完成后的初始化
document.addEventListener("DOMContentLoaded", () => {
  console.log("OpenTiny NEXT 侧边栏已加载");
  initializeSidePanel();
});

// 初始化侧边栏功能
function initializeSidePanel() {
  // 绑定按钮事件
  bindButtonEvents();

  // 添加动画效果
  addAnimationEffects();
}

// 绑定按钮事件
function bindButtonEvents() {
  // 刷新按钮
  const refreshBtn = document.getElementById("refreshBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      location.reload();
    });
  }

  // 设置按钮
  const settingsBtn = document.getElementById("settingsBtn");
  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      chrome.runtime.openOptionsPage();
    });
  }

  // 意见反馈链接
  const feedbackLink = document.getElementById("feedbackLink");
  if (feedbackLink) {
    feedbackLink.addEventListener("click", (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: "https://opentiny.design/feedback" });
    });
  }
}

// 添加动画效果
function addAnimationEffects() {
  // 为介绍功能卡片添加进入动画
  const introFeatures = document.querySelectorAll(".intro-feature");
  introFeatures.forEach((item, index) => {
    item.style.opacity = "0";
    item.style.transform = "translateY(20px)";

    setTimeout(() => {
      item.style.transition = "all 0.4s ease";
      item.style.opacity = "1";
      item.style.transform = "translateY(0)";
    }, index * 150);
  });

  // 为亮点列表添加进入动画
  const highlightItems = document.querySelectorAll(".highlights-list li");
  highlightItems.forEach((item, index) => {
    item.style.opacity = "0";
    item.style.transform = "translateX(-20px)";

    setTimeout(() => {
      item.style.transition = "all 0.3s ease";
      item.style.opacity = "1";
      item.style.transform = "translateX(0)";
    }, introFeatures.length * 150 + index * 100);
  });
}
