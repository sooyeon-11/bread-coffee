// Main App
(function () {
  function getPageSize() { return window.innerWidth <= 540 ? 6 : 12; }
  let currentRegion = '부산';
  let currentSubRegion = 'all';
  let currentCategory = 'all';
  let searchQuery = '';
  let displayCount = getPageSize();

  // Slider state
  let sliderIndex = 0;
  let sliderCount = 0;
  let touchStartX = 0;

  // DOM
  const searchInput = document.getElementById('searchInput');
  const searchClear = document.getElementById('searchClear');
  const regionTabs = document.getElementById('regionTabs');
  const subTabs = document.getElementById('subTabs');
  const cardsGrid = document.getElementById('cardsGrid');
  const sectionTitle = document.getElementById('sectionTitle');
  const storeCount = document.getElementById('storeCount');
  const loadMoreWrap = document.getElementById('loadMoreWrap');
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  const modalOverlay = document.getElementById('modalOverlay');
  const modalClose = document.getElementById('modalClose');
  const sliderTrack = document.getElementById('sliderTrack');
  const sliderPrev = document.getElementById('sliderPrev');
  const sliderNext = document.getElementById('sliderNext');
  const sliderDots = document.getElementById('sliderDots');

  const BUSAN_OTHER_SUBS = ['강서구', '동구', '동래', '북구', '사하구', '남구', '사상구'];
  const TAB_IDS = ['tabHome', 'tabMenu', 'tabReview', 'tabInfo'];

  // ========== Helpers ==========
  function formatPrice(price) {
    if (!price) return '';
    const num = parseInt(price, 10);
    if (isNaN(num)) return price;
    return num.toLocaleString('ko-KR') + '원';
  }

  function getFilteredStores() {
    let stores = typeof STORES_DATA !== 'undefined' ? STORES_DATA : [];
    if (currentRegion !== 'all') stores = stores.filter(s => s.region === currentRegion);
    if (currentRegion === '부산' && currentSubRegion !== 'all') {
      if (currentSubRegion === '기타') stores = stores.filter(s => BUSAN_OTHER_SUBS.includes(s.subRegion));
      else stores = stores.filter(s => s.subRegion === currentSubRegion);
    }
    if (currentCategory !== 'all') stores = stores.filter(s => s.category === currentCategory);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      stores = stores.filter(s =>
        s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q) ||
        s.district.toLowerCase().includes(q) || (s.subRegion && s.subRegion.toLowerCase().includes(q))
      );
    }
    return stores;
  }

  function updateTabCounts() {
    const stores = typeof STORES_DATA !== 'undefined' ? STORES_DATA : [];
    const regions = { '부산': 0, '울산': 0, '대구': 0, '경북': 0 };
    stores.forEach(s => { if (regions[s.region] !== undefined) regions[s.region]++; });
    regionTabs.querySelectorAll('.tab-main').forEach(tab => {
      const region = tab.dataset.region;
      tab.innerHTML = `${region} <span class="tab-count">(${regions[region] || 0})</span>`;
    });
    if (currentRegion === '부산') {
      const busanStores = stores.filter(s => s.region === '부산');
      subTabs.querySelectorAll('.tab-sub').forEach(tab => {
        const sub = tab.dataset.sub;
        let count;
        if (sub === 'all') count = busanStores.length;
        else if (sub === '기타') count = busanStores.filter(s => BUSAN_OTHER_SUBS.includes(s.subRegion)).length;
        else count = busanStores.filter(s => s.subRegion === sub).length;
        tab.innerHTML = `${sub === 'all' ? '전체' : sub} <span class="tab-count">(${count})</span>`;
      });
    }
  }

  function updateSubTabsVisibility() { subTabs.hidden = currentRegion !== '부산'; }

  function createCard(store) {
    const card = document.createElement('div');
    card.className = 'store-card';
    card.onclick = () => openModal(store);
    const imageHtml = store.thumbnail
      ? `<img class="card-image" src="${store.thumbnail}" alt="${store.name}" loading="lazy" onerror="this.outerHTML='<div class=\\'card-image-placeholder\\'>🥨</div>'">`
      : `<div class="card-image-placeholder">🥨</div>`;
    const locationParts = store.address.split(' ');
    const locationText = store.subRegion
      ? `${store.subRegion} ${locationParts.slice(2, 3).join('')}`
      : `${store.district} ${locationParts.slice(2, 3).join('')}`;
    card.innerHTML = `${imageHtml}<div class="card-body"><div class="card-top"><span class="card-name" title="${store.name}">${store.name}</span><span class="badge badge-${store.category}">${store.category}</span></div><div class="card-location">${locationText}</div>${store.phone ? `<div class="card-phone">${store.phone}</div>` : ''}</div>`;
    return card;
  }

  function renderCards() {
    const stores = getFilteredStores();
    const visible = stores.slice(0, displayCount);
    cardsGrid.innerHTML = '';
    if (visible.length === 0) {
      cardsGrid.innerHTML = `<div class="no-results">검색 결과가 없습니다.</div>`;
      loadMoreWrap.hidden = true; storeCount.textContent = ''; return;
    }
    visible.forEach(store => cardsGrid.appendChild(createCard(store)));
    storeCount.textContent = `${stores.length}개`;
    loadMoreWrap.hidden = visible.length >= stores.length;
    const regionName = currentRegion === 'all' ? '전체' : currentRegion;
    const subName = (currentRegion === '부산' && currentSubRegion !== 'all') ? ` ${currentSubRegion}` : '';
    sectionTitle.textContent = searchQuery ? `"${searchQuery}" 검색 결과` : `${regionName}${subName} 카페 & 빵집`;
    MapModule.renderMarkers(stores, openModal);
    if (stores.length > 0) {
      if (searchQuery) MapModule.fitToStores(stores);
      else MapModule.setRegion(currentRegion, currentSubRegion, stores);
    }
  }

  // ========== Slider ==========
  function initSlider(images) {
    sliderTrack.innerHTML = ''; sliderDots.innerHTML = ''; sliderIndex = 0;
    if (!images || images.length === 0) {
      sliderTrack.innerHTML = `<div class="slider-placeholder">🥨</div>`;
      sliderCount = 0; sliderPrev.hidden = true; sliderNext.hidden = true; return;
    }
    sliderCount = images.length;
    images.forEach((url, i) => {
      const img = document.createElement('img');
      img.src = url; img.alt = `사진 ${i + 1}`; img.loading = 'lazy';
      img.onerror = function () { this.src = ''; this.style.background = '#efe6dc'; };
      sliderTrack.appendChild(img);
    });
    sliderPrev.hidden = sliderCount <= 1; sliderNext.hidden = sliderCount <= 1;
    if (sliderCount > 1) {
      images.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = `slider-dot${i === 0 ? ' active' : ''}`;
        dot.onclick = (e) => { e.stopPropagation(); goToSlide(i); };
        sliderDots.appendChild(dot);
      });
    }
    updateSlider();
  }

  function goToSlide(index) { sliderIndex = Math.max(0, Math.min(index, sliderCount - 1)); updateSlider(); }
  function updateSlider() {
    sliderTrack.style.transform = `translateX(-${sliderIndex * 100}%)`;
    sliderDots.querySelectorAll('.slider-dot').forEach((dot, i) => dot.classList.toggle('active', i === sliderIndex));
    sliderPrev.style.opacity = sliderIndex === 0 ? '0.3' : '1';
    sliderNext.style.opacity = sliderIndex === sliderCount - 1 ? '0.3' : '1';
  }

  sliderPrev.addEventListener('click', (e) => { e.stopPropagation(); goToSlide(sliderIndex - 1); });
  sliderNext.addEventListener('click', (e) => { e.stopPropagation(); goToSlide(sliderIndex + 1); });
  const slider = document.getElementById('modalSlider');
  slider.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  slider.addEventListener('touchend', (e) => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) { diff > 0 ? goToSlide(sliderIndex + 1) : goToSlide(sliderIndex - 1); }
  }, { passive: true });

  // ========== Modal Tabs ==========
  const modalTabBtns = document.querySelectorAll('.modal-tab');
  function switchModalTab(tabName) {
    modalTabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.modalTab === tabName));
    TAB_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('active', id === 'tab' + tabName.charAt(0).toUpperCase() + tabName.slice(1));
    });
  }
  modalTabBtns.forEach(btn => btn.addEventListener('click', () => switchModalTab(btn.dataset.modalTab)));

  // ========== Modal ==========
  function openModal(store) {
    switchModalTab('home');
    initSlider(store.images);

    // Home tab
    document.getElementById('modalName').textContent = store.name;
    const badge = document.getElementById('modalBadge');
    badge.textContent = store.category;
    badge.className = `modal-badge badge-${store.category}`;

    // Micro review
    const microEl = document.getElementById('modalMicroReview');
    if (store.microReview) { microEl.textContent = `"${store.microReview}"`; microEl.hidden = false; }
    else microEl.hidden = true;

    // Info
    document.getElementById('modalAddress').innerHTML = `<span class="info-icon">📍</span>${store.roadAddress || store.address}`;
    const phoneEl = document.getElementById('modalPhone');
    const phone = store.virtualPhone || store.phone;
    if (phone) { phoneEl.innerHTML = `<span class="info-icon">📞</span>${phone}`; phoneEl.hidden = false; }
    else phoneEl.hidden = true;

    const hoursEl = document.getElementById('modalHours');
    if (store.hours) {
      hoursEl.innerHTML = `<span class="info-icon">🕐</span><span>${store.hours}</span><a class="hours-detail-link" href="https://m.place.naver.com/place/${store.id}/information" target="_blank" rel="noopener">영업시간 전체보기</a>`;
      hoursEl.hidden = false;
    } else hoursEl.hidden = true;

    const subwayEl = document.getElementById('modalSubway');
    if (store.nearestSubway) {
      subwayEl.innerHTML = `<span class="info-icon">🚇</span>${store.nearestSubway.name} ${store.nearestSubway.exit}번 출구 도보 ${store.nearestSubway.walkTime}분`;
      subwayEl.hidden = false;
    } else subwayEl.hidden = true;

    // Links (dynamic - naver map always, others conditional)
    const linksEl = document.getElementById('modalLinks');
    linksEl.innerHTML = '';
    // Naver Map (always)
    linksEl.innerHTML += `<a class="modal-link-btn naver-btn" href="https://map.naver.com/p/entry/place/${store.id}" target="_blank" rel="noopener"><svg width="16" height="16" viewBox="0 0 20 20"><path d="M13.5 10.6L6.3 2H2v16h4.5V9.4L13.7 18H18V2h-4.5v8.6z" fill="#fff"/></svg>네이버 지도</a>`;
    // Instagram
    if (store.instagramUrl) {
      linksEl.innerHTML += `<a class="modal-link-btn insta-btn" href="${store.instagramUrl}" target="_blank" rel="noopener"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" stroke="#fff" stroke-width="2"/><circle cx="12" cy="12" r="5" stroke="#fff" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.5" fill="#fff"/></svg>Instagram</a>`;
    }
    // Blog
    if (store.blogUrl) {
      linksEl.innerHTML += `<a class="modal-link-btn blog-btn" href="${store.blogUrl}" target="_blank" rel="noopener">Blog</a>`;
    }
    // Homepage
    if (store.homepageUrl) {
      linksEl.innerHTML += `<a class="modal-link-btn homepage-btn" href="${store.homepageUrl}" target="_blank" rel="noopener">홈페이지</a>`;
    }

    // Menu tab (big images like Naver Map)
    const menuList = document.getElementById('menuList');
    menuList.innerHTML = '';
    if (store.menus && store.menus.length > 0) {
      store.menus.forEach(m => {
        const item = document.createElement('div');
        item.className = 'menu-item';
        const imgHtml = m.image ? `<img class="menu-item-img" src="${m.image}" alt="${m.name}" loading="lazy" onerror="this.style.display='none'">` : '';
        item.innerHTML = `${imgHtml}<div class="menu-item-info"><div class="menu-item-name">${m.name}</div>${m.price ? `<div class="menu-item-price">${formatPrice(m.price)}</div>` : ''}</div>`;
        menuList.appendChild(item);
      });
    } else {
      menuList.innerHTML = `<div class="menu-empty">등록된 메뉴가 없습니다.</div>`;
    }

    // Review tab
    const reviewSummary = document.getElementById('reviewSummary');
    reviewSummary.innerHTML = '';
    if (store.reviewTotal) {
      reviewSummary.innerHTML = `
        <div class="review-stat"><span class="review-stat-num">${store.reviewTotal.toLocaleString()}</span><span class="review-stat-label">방문자 리뷰</span></div>
        ${store.imageReviewCount ? `<div class="review-stat"><span class="review-stat-num">${store.imageReviewCount.toLocaleString()}</span><span class="review-stat-label">사진 리뷰</span></div>` : ''}
      `;
    }

    // Visitor reviews (with photos, clickable)
    const vrEl = document.getElementById('visitorReviews');
    vrEl.innerHTML = '';
    if (store.visitorReviews && store.visitorReviews.length > 0) {
      store.visitorReviews.forEach(r => {
        const imgsHtml = r.images && r.images.length > 0
          ? `<div class="visitor-review-images">${r.images.map(img => `<img src="${img}" alt="리뷰 사진" loading="lazy" onerror="this.style.display='none'">`).join('')}</div>`
          : '';
        const div = document.createElement('div');
        div.className = 'visitor-review-item';
        div.innerHTML = `<div class="visitor-review-author">${r.author}</div><div class="visitor-review-body">${r.body.substring(0, 80)}${r.body.length > 80 ? '...' : ''}</div>${imgsHtml}`;
        div.onclick = () => openReviewDetail(r);
        vrEl.appendChild(div);
      });
    }

    // Blog reviews
    const blogTitle = document.getElementById('blogReviewsTitle');
    const blogEl = document.getElementById('blogReviews');
    blogEl.innerHTML = '';
    if (store.blogReviews && store.blogReviews.length > 0) {
      blogTitle.hidden = false;
      store.blogReviews.forEach(r => {
        const a = document.createElement('a');
        a.className = 'blog-review-item';
        a.href = r.url; a.target = '_blank'; a.rel = 'noopener';
        a.innerHTML = `<div class="blog-review-title">${r.title}</div><div class="blog-review-author">${r.name}</div>`;
        blogEl.appendChild(a);
      });
    } else {
      blogTitle.hidden = true;
      if (!store.visitorReviews || store.visitorReviews.length === 0) {
        vrEl.innerHTML = `<div class="menu-empty">등록된 리뷰가 없습니다.</div>`;
      }
    }
    document.getElementById('reviewMoreLink').href = `https://m.place.naver.com/place/${store.id}/review/visitor`;

    // Info tab
    const convSection = document.getElementById('infoConveniences');
    const convList = document.getElementById('conveniencesList');
    if (store.conveniences && store.conveniences.length > 0) {
      convList.innerHTML = store.conveniences.map(c => `<span class="info-tag">${c}</span>`).join('');
      convSection.hidden = false;
    } else convSection.hidden = true;

    const seatSection = document.getElementById('infoSeat');
    const seatList = document.getElementById('seatList');
    if (store.seatInfo && store.seatInfo.length > 0) {
      seatList.innerHTML = store.seatInfo.map(s => `<span class="info-tag">${s.name}${s.description ? ` (${s.description})` : ''}</span>`).join('');
      seatSection.hidden = false;
    } else seatSection.hidden = true;

    const roadSection = document.getElementById('infoRoad');
    const roadText = document.getElementById('roadGuideText');
    if (store.roadGuide) {
      roadText.textContent = store.roadGuide;
      roadSection.hidden = false;
    } else roadSection.hidden = true;

    modalOverlay.hidden = false;
    document.body.style.overflow = 'hidden';
    document.querySelector('.modal-scroll').scrollTop = 0;
    MapModule.highlightStore(store);
  }

  function closeModal() { modalOverlay.hidden = true; document.body.style.overflow = ''; }

  // ========== Review Detail ==========
  const reviewOverlay = document.getElementById('reviewDetailOverlay');
  const reviewDetailClose = document.getElementById('reviewDetailClose');

  function openReviewDetail(review) {
    const imgsEl = document.getElementById('reviewDetailImages');
    imgsEl.innerHTML = '';
    if (review.images && review.images.length > 0) {
      review.images.forEach(img => {
        const imgEl = document.createElement('img');
        imgEl.src = img;
        imgEl.alt = '리뷰 사진';
        imgEl.loading = 'lazy';
        imgEl.onerror = function () { this.style.display = 'none'; };
        imgsEl.appendChild(imgEl);
      });
    }
    document.getElementById('reviewDetailAuthor').textContent = review.author;
    document.getElementById('reviewDetailText').textContent = review.body;
    reviewOverlay.hidden = false;
  }

  reviewDetailClose.addEventListener('click', () => { reviewOverlay.hidden = true; });
  reviewOverlay.addEventListener('click', (e) => { if (e.target === reviewOverlay) reviewOverlay.hidden = true; });

  // ========== Event Listeners ==========
  const catTabs = document.getElementById('catTabs');

  regionTabs.addEventListener('click', (e) => {
    const mainTab = e.target.closest('.tab-main');
    if (!mainTab) return;
    regionTabs.querySelectorAll('.tab-main').forEach(t => t.classList.remove('active'));
    mainTab.classList.add('active');
    currentRegion = mainTab.dataset.region;
    currentSubRegion = 'all';
    displayCount = getPageSize();
    subTabs.querySelectorAll('.tab-sub').forEach(t => t.classList.remove('active'));
    subTabs.querySelector('[data-sub="all"]').classList.add('active');
    updateSubTabsVisibility(); updateTabCounts(); renderCards();
  });

  catTabs.addEventListener('click', (e) => {
    const catTab = e.target.closest('.tab-cat');
    if (!catTab) return;
    catTabs.querySelectorAll('.tab-cat').forEach(t => t.classList.remove('active'));
    catTab.classList.add('active');
    currentCategory = catTab.dataset.cat;
    displayCount = getPageSize();
    renderCards();
  });

  subTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.tab-sub');
    if (!tab) return;
    subTabs.querySelectorAll('.tab-sub').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentSubRegion = tab.dataset.sub;
    displayCount = getPageSize();
    renderCards();
  });

  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      searchQuery = searchInput.value.trim();
      searchClear.hidden = !searchQuery;
      displayCount = getPageSize();
      renderCards();
    }, 300);
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = ''; searchQuery = ''; searchClear.hidden = true;
    displayCount = getPageSize(); renderCards();
  });

  loadMoreBtn.addEventListener('click', () => { displayCount += getPageSize(); renderCards(); });
  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
    if (!modalOverlay.hidden && sliderCount > 1) {
      if (e.key === 'ArrowLeft') goToSlide(sliderIndex - 1);
      if (e.key === 'ArrowRight') goToSlide(sliderIndex + 1);
    }
  });

  // Sub-tabs toggle (mobile)
  const subTabsToggle = document.getElementById('subTabsToggle');
  function initSubTabsCollapse() {
    if (window.innerWidth <= 540) { subTabs.classList.add('collapsed'); subTabsToggle.textContent = '더보기 ▾'; }
    else subTabs.classList.remove('collapsed');
  }
  subTabsToggle.addEventListener('click', () => {
    const isCollapsed = subTabs.classList.toggle('collapsed');
    subTabsToggle.textContent = isCollapsed ? '더보기 ▾' : '접기 ▴';
  });
  window.addEventListener('resize', initSubTabsCollapse);

  // Sync header height for sticky tabs
  function syncHeaderHeight() {
    const header = document.querySelector('.header');
    if (header) document.documentElement.style.setProperty('--header-height', header.offsetHeight + 'px');
  }
  window.addEventListener('resize', syncHeaderHeight);

  // Init
  syncHeaderHeight();
  MapModule.init();
  updateSubTabsVisibility();
  initSubTabsCollapse();

  // Load data from JSON
  fetch('data/stores.json')
    .then(res => res.json())
    .then(data => {
      window.STORES_DATA = data;
      updateTabCounts();
      renderCards();
    })
    .catch(() => {
      // Fallback: try stores.js global
      if (typeof STORES_DATA !== 'undefined') {
        updateTabCounts();
        renderCards();
      }
    });
})();
