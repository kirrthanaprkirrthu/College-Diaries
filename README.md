# College Diaries 🎓

A beginner-friendly, student-built website where students share their profiles, photos, skills, and college stories while learning HTML, CSS, JavaScript, Git, and GitHub collaboration.

## Features

- Student profiles with photos, introductions, skills, and personal stories
- Share a diary with the browser's sharing menu or copy its profile link
- Search by name, skill, or interest
- Filter profiles by course
- Responsive homepage menu with Home, Students, and Contribution Guide shortcuts
- Beginner-friendly project ideas with GitHub Discussions links
- Completed project showcases with team credits and repository or demo links
- An interactive C programming quiz with explanations and a score summary
- A five-round classmate guessing game with profile clues, answer feedback, and diary links
- Responsive layout for mobile and desktop
- A live profile builder that generates safe, ready-to-paste student card HTML
- Add a project idea in `projects.js`

## Technologies

- HTML
- CSS
- JavaScript
- Git and GitHub

## Project Structure

```text
college-diaries/
├── index.html
├── profile-builder.html
├── profile-builder.css
├── profile-builder.js
├── quiz.html
├── style.css
├── app.js
├── quiz.js
├── projects.js
├── quiz-questions.js
├── classmate-game.html
├── classmate-game.css
├── classmate-game.js
├── theme-toggle.js
├── images/
├── README.md
└── LICENSE
```

## Run Locally

Open `index.html` in your browser. The C quiz and classmate game each have their own page linked from the homepage. The site does not need a server or any extra tools.

## How to Contribute

### Build a Student Profile

Open **Build a profile** from the homepage (or visit `profile-builder.html`), fill in the required details, and use the live preview to check your card. A GitHub profile URL is optional, but when provided it must be a valid `https://github.com/username` URL. Select **Copy HTML** to generate and copy your profile card for submission.

To submit your profile:

1. Fork and clone the [`Devi-prasad-H/college-diaries` repository](https://github.com/Devi-prasad-H/college-diaries) as described below.
2. Save your profile photo in `images/` (for example, `images/your-name.jpg`).
3. Paste the generated card inside `<div id="grid" class="grid">` in `index.html` and change the image `src` to your photo's path.
4. Open `index.html` and check that your card appears in search, matches its course filter, and opens the diary with **View diary**.
5. Take a screenshot of your working profile and include it in your pull request.

The builder escapes special characters in profile text so they remain text in the generated HTML, rather than becoming markup.

### Add a Project Idea

Open `projects.js` and add an entry to the `projectIdeas` array. Include a title, a short description, your name as the creator, skills teammates can practise, one of the three supported statuses, and the repository's GitHub Discussions URL:

```js
{
  title: 'C Quiz Game',
  description: 'Build a small quiz together. I can use help with questions and game logic.',
  creator: 'Your Name',
  skills: ['C', 'Problem solving'],
  status: 'Looking for teammates',
  discussionUrl: 'https://github.com/Devi-prasad-H/college-diaries/discussions'
}
```

Every idea is marked **Beginners welcome**. Use `Looking for teammates`, `Building`, or `Completed` for the status. For a completed project, also add `teamCredits` (an array of names) and `projectUrl` (a demo or repository link); the showcase will display those instead of the interest link. Replace the sample discussion URL with the idea's specific discussion thread when one is available. Submit the data-file change through a pull request.

The project data is a regular JavaScript file, so it works when opening `index.html` directly in a browser.

### C Programming Quiz

The quiz is available on `quiz.html` and displays questions one at a time, explains each answer after submission, and shows a final score with a retry option. To contribute or update quiz questions, edit the `cQuizQuestions` array in `quiz-questions.js`. Each question has a prompt, C code, four answer options, the zero-based index of the correct option, and an explanation.

### 1. Fork the Repository

Fork the [College Diaries repository](https://github.com/Devi-prasad-H/college-diaries) to create a copy in your GitHub account.

### 2. Clone Your Fork

Clone your fork by replacing `YOUR_USERNAME` with your GitHub username:

```bash
git clone https://github.com/YOUR_USERNAME/college-diaries.git
cd college-diaries
```

### 3. Create a Branch

Replace `your-name` with your name:

```bash
git switch -c profile/your-name
```

### 4. Add Your Photo

Save your photo at:

```text
images/your-name.jpg
```

### 5. Add Your HTML Profile

Open `profile-builder.html` (or select **Build a profile** from the homepage), fill in your details, and check the live preview. Select **Copy HTML**, then paste the generated card inside `<div id="grid" class="grid">` in `index.html`. Change its image `src` to the photo you added in step 4. The builder supports the `MCA`, `BCA`, and `BSc Data Science` course filters. You do not need to edit `app.js`.

### 6. Test Your Changes

Open `index.html` in your browser and check:

- Your photo and profile appear correctly.
- Your profile appears in search results.
- The course filter works.
- Your diary opens.
- Sharing or copying the link opens your specific diary.
- The layout looks good on mobile.

### 7. Commit and Push

```bash
git add index.html images/your-name.jpg
git commit -m "Add my student profile"
git push -u origin profile/your-name
```

### 8. Open a Pull Request

On GitHub, click **Compare & pull request**.

Select the original repository's `main` branch as the destination.

Include:
- A clear title, such as `Add Aarav's profile`
- A short description of your changes
- A screenshot of your profile

Your teacher will review the PR and request corrections or merge it.

To make corrections, update the same branch, commit, and push again. The existing PR will update automatically.

## Contribution Rules

- Use one branch and one PR per task.
- Add your own HTML card and photo; do not remove or change another student's card.
- Write meaningful commit messages.
- Use only images you have permission to share.
- Avoid sharing private contact details.
- Test your changes before submitting.

## Practice Tasks

- Add your profile and photo.
- Improve the mobile layout.
- Add a course filter.
- Improve accessibility.
- Fix a bug or improve documentation.

## Sample Profiles

The included profiles and avatars are illustrative examples. Replace them or add real student profiles through pull requests.

## License

This project is licensed under the MIT License. See `LICENSE` for details.
