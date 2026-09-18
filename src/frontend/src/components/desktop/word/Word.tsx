import "./word.css";

const MENUS = ["File", "Edit", "View", "Insert", "Format", "Tools", "Table", "Window", "Help"] as const;

export function Word() {
	return (
		<div className="word" aria-label="resume.doc">
			<div className="word__menu" aria-hidden>
				{MENUS.map((label) => <span key={label}>{label}</span>)}
			</div>
			<div className="word__toolbar" aria-hidden>
				{["N", "O", "S", "P"].map((label) => (
					<button key={label} type="button" className="word__tool chrome-raised" tabIndex={-1}>{label}</button>
				))}
			</div>
			<div className="word__ruler" aria-hidden />
			<div className="word__scroll">
				<article className="word__page">
					<h1 className="word__name">Adam Torres Encarnacion</h1>
					<p className="word__contact">
						570-710-5165 · art5809@psu.edu · linkedin.com/in/adam-torres-encarnacion · github.com/0xABAN
					</p>

					<h2 className="word__h">Education</h2>
					<div className="word__job"><span>The Pennsylvania State University</span><span>Expected: May 2027</span></div>
					<div className="word__role"><span>B.S. in Data Science, B.S. in Statistics</span><span>GPA: 3.7</span></div>

					<h2 className="word__h">Work Experience</h2>
					<div className="word__job"><span>Amazon</span><span>May 2026 – Aug 2026</span></div>
					<div className="word__role"><span>Software Engineering Intern</span><span>Cupertino, CA</span></div>
					<ul>
						<li>Developed a dual-arm fiber-cleaning Flexiv robot infra targeting $28.6M/year in savings across 85 data centers</li>
						<li>Built a 19-route FastAPI control plane over SSH, keeping the 1 kHz loop server-side for remote client use</li>
						<li>Centralized 100% of robot geometry and few-shot vision data using typed DynamoDB profiles and S3 storage</li>
						<li>Cut connector/module errors by 14% via a 3-LLM Bedrock voting system and Pydantic-validated JSON</li>
						<li>Designed a Karpathy-inspired SQLite MCP, compiling 74 sources into a shared 22-page cited knowledge base</li>
					</ul>
					<div className="word__job"><span>IBM</span><span>May 2025 – Present</span></div>
					<div className="word__role"><span>AI Engineering Intern</span><span>Remote</span></div>
					<ul>
						<li>Shipped LLM RESTful microservice to power documentation for 3100+ scripts, cutting client costs by $223,000</li>
						<li>Refined file chunking solution using Llama-4 and GPT-4o-mini to process 7+ large-scale internal requests</li>
						<li>Deployed serverless Azure Function Apps with codebase auto-scaling, reducing manual review by 78%</li>
					</ul>

					<h2 className="word__h">Personal Projects</h2>
					<div className="word__job"><span>formula</span><span>Python, FastAPI, Next.js, LangGraph</span></div>
					<ul>
						<li>Built E2E haircare matcher ranking products by INCI ingredient fit after spending $300+ on biased marketing</li>
						<li>Hand-built agentic Firecrawl + Claude Code harness scraping 250 brands, 6,500 products, and 9,000 unique INCI</li>
						<li>Reranked up to 2,000 candidates into top-100 with Cohere Rerank 4 over YAML fit docs tied to user HairProfile</li>
						<li>Validated finalists via TourRank tournament (R=5 brackets, Grok reasoning) across 3-axis aesthetician rubric</li>
					</ul>
					<div className="word__job"><span>nexdraw (NexHacks ’26 ByteDance 2nd place)</span><span>TypeScript, Next.js, Gemini</span></div>
					<ul>
						<li>Built “Cursor for artists” solo against 1500+ entrants for real-time LLM canvas editing on Gemini + TypeScript</li>
						<li>Engineered Supabase auto-save (2s debounce, offline-aware) persisting JSONB + per-board PNG previews</li>
					</ul>
					<div className="word__job"><span>simulacra (YHack ’26 K2 Think V2 track winner)</span><span>Next.js, Phaser, FastAPI</span></div>
					<ul>
						<li>Won $500 K2 Think V2 track for a pixel-art policy sim streaming 100 LLM agents across 15 rounds over Socket.IO</li>
						<li>Built LangGraph pipeline injecting 6-trait personas across 8 roles, fanning out parallel LLM reactions via asyncio</li>
					</ul>
					<div className="word__job"><span>terrar.ai (HackPrinceton ’25 xAI 1st place)</span><span>C#, xAI, tModLoader</span></div>
					<ul>
						<li>Launched NPC agents mod for Terraria with 10+ tools supported, winning $8k in xAI credits out of 600+ entrants</li>
						<li>Engineered ReAct loop in C# on grok-4-fast for real-time agentic reasoning, scaling to 50+ parallel agents</li>
					</ul>

					<h2 className="word__h">Leadership</h2>
					<div className="word__job"><span>Claude Builder Club</span><span>Aug 2025 – Jan 2026</span></div>
					<div className="word__role"><span>Founder</span><span>University Park, PA</span></div>
					<ul>
						<li>Selected as 1 of 5 ambassadors to bring Claude AI to Penn State, achieving 260+ club signups within 1 month</li>
						<li>Led 3 workshops on MCPs, Claude Code, and Agentic AI to 170+ students, with 90% attending follow-up sessions</li>
					</ul>
					<div className="word__job"><span>Epoch AI</span><span>Jan 2025 – Jan 2026</span></div>
					<div className="word__role"><span>Director</span><span>University Park, PA</span></div>
					<ul>
						<li>Led biweekly reading groups on ReAct, RouteLLM, Deepseek to 20+ students per semester at 85% attendance</li>
						<li>Partnered with 3+ AI labs to host PhD panels and professor-led research demos, boosting membership by 247%</li>
					</ul>

					<h2 className="word__h">Technical Skills</h2>
					<p className="word__skills"><b>Languages:</b> Python, Java, SQL, JavaScript, TypeScript, C++, C#, R, HTML/CSS</p>
					<p className="word__skills"><b>Frameworks:</b> PyTorch, Huggingface, Pandas, NumPy, LangChain, LangGraph, FastAPI, Node.js, Next.js</p>
					<p className="word__skills"><b>Databases:</b> PostgreSQL, SQLite, MongoDB, Supabase</p>
					<p className="word__skills"><b>Tools:</b> TCP/IP, Socket.IO, AWS (Lambda, S3, ECS), Azure (AI Foundry, Function Apps), Git, Bash</p>
				</article>
			</div>
		</div>
	);
}
