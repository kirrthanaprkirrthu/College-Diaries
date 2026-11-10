const grid = document.querySelector('#grid');
const projectGrid = document.querySelector('#project-grid');
const modal = document.querySelector('#modal');
const content = document.querySelector('#modal-content');
const search = document.querySelector('#search');
const cards = [...grid.querySelectorAll('.card')];
const quoteButton = document.querySelector('#quote-button');
const quoteOutput = document.querySelector('#coding-quote');
const shareStatus = document.querySelector('#share-status');
const codingQuotes = [
  'It works on my machine is not a deployment strategy.',
  'Every expert was once a beginner who refused to give up.',
  'A bug is just an unexpected feature with excellent timing.',
  'Keep calm and check the console.',
  'The best code is the code you understand tomorrow.',
  'First, solve the problem. Then, write the code.',
  'Programming: turning coffee into errors, then into solutions.',
  'Small commits can lead to big ideas.',
  'There are 10 kinds of people: those who understand binary and those who do not.',
  'You do not have to be perfect. You just have to keep debugging.'
];
let previousQuoteIndex = -1;
let filter = 'All';
let shareStatusTimer;

function renderProjects() {
  for (const project of projectIdeas) {
    const card = document.createElement('article');
    card.className = 'project-card';

    const status = document.createElement('span');
    status.className = `project-status ${project.status === 'Completed' ? 'completed' : ''}`;
    status.textContent = project.status;

    const heading = document.createElement('h3');
    heading.textContent = project.title;

    const description = document.createElement('p');
    description.textContent = project.description;

    const creator = document.createElement('p');
    creator.className = 'project-creator';
    creator.textContent = `Creator: ${project.creator}`;

    const welcome = document.createElement('span');
    welcome.className = 'beginner-tag';
    welcome.textContent = 'Beginners welcome';

    const skillsLabel = document.createElement('h4');
    skillsLabel.textContent = 'Skills to practise';

    const skills = document.createElement('div');
    skills.className = 'project-skills';
    for (const skill of project.skills) {
      const tag = document.createElement('span');
      tag.textContent = skill;
      skills.append(tag);
    }

    card.append(status, heading, description, creator, welcome, skillsLabel, skills);

    if (project.status === 'Completed' && project.teamCredits && project.projectUrl) {
      const credits = document.createElement('p');
      credits.className = 'project-credits';
      credits.textContent = `Team credits: ${project.teamCredits.join(', ')}`;

      const projectLink = document.createElement('a');
      projectLink.className = 'project-link';
      projectLink.href = project.projectUrl;
      projectLink.target = '_blank';
      projectLink.rel = 'noopener noreferrer';
      projectLink.textContent = `${project.projectUrlLabel || 'View project'} ↗`;

      card.append(credits, projectLink);
    }

    const discussionLink = document.createElement('a');
    discussionLink.className = 'project-link';
    discussionLink.href = project.discussionUrl;
    discussionLink.target = '_blank';
    discussionLink.rel = 'noopener noreferrer';
    discussionLink.textContent = 'Express interest on GitHub Discussions ↗';
    card.append(discussionLink);

    projectGrid.append(card);
  }
}

renderProjects();

const profileCounts = new Map();
cards.forEach((card, index) => {
  const name = card.querySelector('h3').textContent.trim();
  const baseId = name.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    || `student-${index + 1}`;
  const count = profileCounts.get(baseId) || 0;
  profileCounts.set(baseId, count + 1);
  card.dataset.profileId = count ? `${baseId}-${count + 1}` : baseId;
});


function render() {
  const query = search.value.toLowerCase().trim();
  let visibleCount = 0;

  for (const card of cards) {
    const matchesCourse = filter === 'All' || card.dataset.course === filter;
    const matchesSearch = card.textContent.toLowerCase().includes(query);
    card.hidden = !matchesCourse || !matchesSearch;
    if (!card.hidden) visibleCount++;
  }

  document.querySelector('#empty').hidden = visibleCount > 0;
}

function showProfile(card) {
  const image = card.querySelector('.portrait img').cloneNode();
  const name = card.querySelector('h3').textContent;
  const course = card.dataset.course;
  const year = card.querySelector('.year').textContent;
  const story = card.querySelector('.story').textContent;

  content.replaceChildren(image);
  const heading = document.createElement('h2');
  heading.textContent = name;
  const details = document.createElement('p');
  details.textContent = `${course} · ${year}`;
  const diary = document.createElement('p');
  diary.textContent = story;
  const actions = document.createElement('div');
  actions.className = 'profile-actions';

  const shareButton = document.createElement('button');
  shareButton.type = 'button';
  shareButton.className = 'profile-action share-native';
  shareButton.textContent = 'Share profile';
  shareButton.addEventListener('click', () => shareProfile(card));
  actions.append(shareButton);

  const copyButton = document.createElement('button');
  copyButton.type = 'button';
  copyButton.className = 'profile-action copy-profile-link';
  copyButton.textContent = 'Copy link';
  copyButton.addEventListener('click', () => copyProfileLink(profileUrl(card)));
  actions.append(copyButton);

  content.append(heading, details, diary, actions);
  modal.showModal();
}

function profileUrl(card) {
  const url = new URL(window.location.href);
  url.searchParams.set('profile', card.dataset.profileId);
  url.hash = '';
  return url.href;
}

function showShareStatus(message) {
  shareStatus.textContent = message;
  shareStatus.classList.add('visible');
  window.clearTimeout(shareStatusTimer);
  shareStatusTimer = window.setTimeout(() => {
    shareStatus.classList.remove('visible');
  }, 4000);
}

function legacyCopy(text) {
  const input = document.createElement('textarea');
  input.value = text;
  input.setAttribute('readonly', '');
  input.style.position = 'fixed';
  input.style.left = '-9999px';
  document.body.append(input);
  input.select();

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  } finally {
    input.remove();
  }
  return copied;
}

function showManualCopyLink(url) {
  let input = content.querySelector('.copy-fallback input');
  if (!input) {
    const label = document.createElement('label');
    label.className = 'copy-fallback';
    label.textContent = 'Profile link';
    input = document.createElement('input');
    input.type = 'url';
    input.readOnly = true;
    input.setAttribute('aria-label', 'Profile link to copy');
    label.append(input);
    content.append(label);
  }
  input.value = url;
  input.focus();
  input.select();
}

async function copyProfileLink(url) {
  let copied = false;
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
    } catch {
      copied = legacyCopy(url);
    }
  } else {
    copied = legacyCopy(url);
  }

  if (copied) {
    showShareStatus('Profile link copied to clipboard.');
  } else {
    showManualCopyLink(url);
    showShareStatus('Copy was blocked. Select and copy the profile link shown in the diary.');
  }
}

async function shareProfile(card) {
  const name = card.querySelector('h3').textContent.trim();
  const url = profileUrl(card);
  if (typeof navigator.share !== 'function') {
    await copyProfileLink(url);
    return;
  }

  try {
    await navigator.share({
      title: `${name} | College Diaries`,
      text: `Read ${name}'s diary on College Diaries.`,
      url
    });
  } catch (error) {
    if (error && error.name === 'AbortError') return;
    await copyProfileLink(url);
  }
}

function showGuide() {
  content.innerHTML = `<div class="eyebrow">CONTRIBUTION GUIDE</div>
    <h2>Add your own diary.</h2>
    <p>Add one HTML card to the students section. No JSON or JavaScript edits are needed.</p>
    <ol>
      <li>Fork and clone the class GitHub repository.</li>
      <li>Create a branch: <code>git switch -c profile/your-name</code></li>
      <li>Open <code>index.html</code> and copy a student card inside the <code>id="grid"</code> section. Change the name, course, year, introduction, skills and diary story.</li>
      <li>Add your photo at <code>images/your-name.jpg</code> and update the card's image path.</li>
      <li>Run the website locally and check your profile.</li>
      <li>Commit and push your changes, then open a pull request to your teacher's repository. Include a screenshot.</li>
    </ol>
    <pre>git add index.html images/your-name.jpg
git commit -m "Add my student profile"
git push -u origin profile/your-name</pre>
    <p>The teacher reviews and merges each contribution.</p>`;
  modal.showModal();
}

search.addEventListener('input', render);
quoteButton.addEventListener('click', () => {
  const availableQuotes = codingQuotes
    .map((quote, index) => ({ quote, index }))
    .filter(({ index }) => index !== previousQuoteIndex);
  const nextQuote = availableQuotes[Math.floor(Math.random() * availableQuotes.length)];
  previousQuoteIndex = nextQuote.index;
  quoteOutput.textContent = nextQuote.quote;
});
document.querySelector('#filters').addEventListener('click', event => {
  const button = event.target.closest('button[data-filter]');
  if (!button) return;
  filter = button.dataset.filter;
  document.querySelectorAll('#filters button').forEach(item => {
    item.classList.toggle('active', item === button);
  });
  render();
});
grid.addEventListener('click', event => {
  const button = event.target.closest('.view');
  if (button) showProfile(button.closest('.card'));
});
document.querySelector('#guide').addEventListener('click', showGuide);
document.querySelector('#guide2').addEventListener('click', showGuide);
document.querySelector('.close').addEventListener('click', () => modal.close());

const requestedProfile = new URLSearchParams(window.location.search).get('profile');
if (requestedProfile) {
  const requestedCard = cards.find(card => card.dataset.profileId === requestedProfile);
  if (requestedCard) showProfile(requestedCard);
}
const NOTIF_REPO = "mohdadil1/College-Diaries";
const bell = document.getElementById("notif-bell");
const countEl = document.getElementById("notif-count");
const listEl = document.getElementById("notif-list");

function timeAgo(dateString) {
  const seconds = Math.floor((Date.now() - new Date(dateString)) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + " minutes ago";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + " hours ago";
  return Math.floor(hours / 24) + " days ago";
}

async function loadNotifications() {
  try {
    const res = await fetch(
      "https://api.github.com/repos/" + NOTIF_REPO + "/commits?sha=main&per_page=10"
    );
    const commits = await res.json();
    const lastSeen = localStorage.getItem("notifLastSeen") || 0;
    let unread = 0;
    listEl.innerHTML = "";
    commits.forEach(function (c) {
      const name = c.commit.author.name;
      const message = c.commit.message.split("\n")[0];
      const date = c.commit.author.date;
      if (new Date(date) > new Date(Number(lastSeen))) unread++;
      const item = document.createElement("div");
      item.className = "notif-item";
      item.textContent = name + " contributed: " + message + " — " + timeAgo(date);
      listEl.appendChild(item);
    });
    countEl.textContent = unread;
  } catch (e) {
    listEl.textContent = "Could not load notifications.";
  }
}

bell.addEventListener("click", function () {
  listEl.classList.toggle("hidden");
  localStorage.setItem("notifLastSeen", Date.now());
  countEl.textContent = 0;
});

loadNotifications();
