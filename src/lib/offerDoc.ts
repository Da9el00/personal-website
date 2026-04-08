// Shared types + helpers for the structured offer document.

export type ItemKind = 'choice' | 'question' | 'task';

export type OfferItem = {
	id: string;
	text: string;
	/** Override the section's default item kind. */
	kind?: ItemKind;
	/** When the client changes this item's status, the same status cascades to these item IDs. */
	links?: string[];
};

/**
 * Default kind for an item, given its section's kind.
 */
export function defaultItemKind(sectionKind: OfferSectionKind | undefined): ItemKind {
	if (sectionKind === 'questions' || sectionKind === 'usecase') return 'question';
	if (sectionKind === 'checklist') return 'task';
	return 'choice';
}

export type OfferSectionKind = 'questions' | 'usecase' | 'checklist' | 'note';

export type OfferSection = {
	id: string;
	title: string;
	body?: string;
	kind?: OfferSectionKind;
	items?: OfferItem[];
};

export type ScopeItem = {
	id: string;
	text: string;
	hours: number;
	/** Optional phase label. Consecutive items with the same group are rendered under one header. */
	group?: string;
	links?: string[];
	/** When true, the client cannot mark this item as Later or Skip. */
	required?: boolean;
};

export type ScopeData = {
	label?: string;
	currency?: string;
	hourly_rate?: number;
	fixed_price?: number;
	items: ScopeItem[];
};

export type OfferLang = 'en' | 'da';

export type OfferDoc = {
	lang?: OfferLang;
	client_name?: string;
	title?: string;
	deadline?: string;
	intro?: string;
	outro?: string;
	scope?: ScopeData | null;
	sections: OfferSection[];
};

export type ItemStatus = 'do_now' | 'later' | 'skip' | 'yes' | 'no' | 'done';
const ALL_STATUSES: ItemStatus[] = ['do_now', 'later', 'skip', 'yes', 'no', 'done'];

export type ItemProgress = 'todo' | 'doing' | 'done';

export type OfferEvent = {
	id: string;
	created_at: string;
	project_id: string;
	actor: 'client' | 'admin';
	kind:
		| 'item_status'
		| 'item_note'
		| 'item_progress'
		| 'item_actual_hours'
		| 'comment'
		| 'doc_replaced'
		| 'section_edit';
	ref: string | null;
	payload: Record<string, any>;
};

export type ItemState = {
	status: ItemStatus | null;       // client: do_now / later / skip
	progress: ItemProgress | null;   // admin: todo / doing / done
	note: string;
};

const VALID_KINDS: OfferSectionKind[] = ['questions', 'usecase', 'checklist', 'note'];

/**
 * Escape literal control characters (newline, tab, CR) that appear *inside*
 * JSON string literals. JSON.parse rejects these as "bad control character",
 * but they're a common artifact of pasting from word-wrapped sources. We walk
 * the input character-by-character, tracking whether we're inside a string,
 * and only rewrite control chars when we are.
 */
export function sanitizeOfferJson(input: string): string {
	let out = '';
	let inString = false;
	let escaped = false;
	for (let i = 0; i < input.length; i++) {
		const ch = input[i];
		if (inString) {
			if (escaped) { out += ch; escaped = false; continue; }
			if (ch === '\\') { out += ch; escaped = true; continue; }
			if (ch === '"')  { out += ch; inString = false; continue; }
			if (ch === '\n') { out += '\\n'; continue; }
			if (ch === '\r') { out += '\\r'; continue; }
			if (ch === '\t') { out += '\\t'; continue; }
			out += ch;
		} else {
			if (ch === '"') inString = true;
			out += ch;
		}
	}
	return out;
}

function shortId(used: Set<string>): string {
	let id;
	do {
		id = Math.random().toString(36).slice(2, 10);
	} while (used.has(id));
	used.add(id);
	return id;
}

/**
 * Take untrusted JSON and produce a normalized OfferDoc.
 * - Ensures every section and item has a stable string id (preserves existing).
 * - Drops unknown fields, coerces types, defaults missing values.
 */
export function normalizeOfferDoc(input: unknown): OfferDoc | null {
	if (!input || typeof input !== 'object') return null;
	const obj = input as Record<string, any>;
	const used = new Set<string>();

	// First pass: collect existing ids so generated ones don't collide.
	const rawSections = Array.isArray(obj.sections) ? obj.sections : [];
	for (const s of rawSections) {
		if (s && typeof s.id === 'string' && s.id) used.add(s.id);
		const items = Array.isArray(s?.items) ? s.items : [];
		for (const it of items) {
			if (it && typeof it.id === 'string' && it.id) used.add(it.id);
		}
	}
	const rawScope = obj.scope;
	if (rawScope && typeof rawScope === 'object' && Array.isArray(rawScope.items)) {
		for (const it of rawScope.items) {
			if (it && typeof it.id === 'string' && it.id) used.add(it.id);
		}
	}

	const sections: OfferSection[] = rawSections.map((s: any) => {
		const id = (typeof s?.id === 'string' && s.id) ? s.id : shortId(used);
		const items: OfferItem[] = (Array.isArray(s?.items) ? s.items : []).map((it: any) => {
			if (typeof it === 'string') {
				return { id: shortId(used), text: it };
			}
			const itemId = (typeof it?.id === 'string' && it.id) ? it.id : shortId(used);
			const links = Array.isArray(it?.links) ? it.links.filter((l: any) => typeof l === 'string') : undefined;
			const kind: ItemKind | undefined = (it?.kind === 'choice' || it?.kind === 'question' || it?.kind === 'task') ? it.kind : undefined;
			return {
				id: itemId,
				text: typeof it?.text === 'string' ? it.text : String(it ?? ''),
				...(kind ? { kind } : {}),
				...(links && links.length > 0 ? { links } : {}),
			};
		});
		return {
			id,
			title: typeof s?.title === 'string' ? s.title : '',
			body: typeof s?.body === 'string' ? s.body : '',
			kind: VALID_KINDS.includes(s?.kind) ? s.kind : 'questions',
			items,
		};
	});

	let scope: ScopeData | null = null;
	if (rawScope && typeof rawScope === 'object') {
		const rs = rawScope as Record<string, any>;
		const items: ScopeItem[] = (Array.isArray(rs.items) ? rs.items : []).map((it: any) => {
			const iid = (typeof it?.id === 'string' && it.id) ? it.id : shortId(used);
			const hoursRaw = it?.hours;
			const hours = typeof hoursRaw === 'number'
				? hoursRaw
				: Number.isFinite(Number(hoursRaw)) ? Number(hoursRaw) : 0;
			const links = Array.isArray(it?.links) ? it.links.filter((l: any) => typeof l === 'string') : undefined;
			const group = typeof it?.group === 'string' && it.group ? it.group : undefined;
			const required = it?.required === true ? true : undefined;
			return {
				id: iid,
				text: typeof it?.text === 'string' ? it.text : String(it ?? ''),
				hours,
				...(group ? { group } : {}),
				...(links && links.length > 0 ? { links } : {}),
				...(required ? { required: true } : {}),
			};
		});
		scope = {
			label: typeof rs.label === 'string' ? rs.label : 'Scope & price',
			currency: typeof rs.currency === 'string' ? rs.currency : 'DKK',
			hourly_rate: typeof rs.hourly_rate === 'number' ? rs.hourly_rate : (Number(rs.hourly_rate) || undefined),
			fixed_price: typeof rs.fixed_price === 'number' ? rs.fixed_price : (Number(rs.fixed_price) || undefined),
			items,
		};
	}

	return {
		lang: (obj.lang === 'da' || obj.lang === 'en') ? obj.lang : undefined,
		client_name: typeof obj.client_name === 'string' ? obj.client_name : undefined,
		title: typeof obj.title === 'string' ? obj.title : undefined,
		deadline: typeof obj.deadline === 'string' ? obj.deadline : undefined,
		intro: typeof obj.intro === 'string' ? obj.intro : '',
		outro: typeof obj.outro === 'string' ? obj.outro : '',
		scope,
		sections,
	};
}

// ── i18n ────────────────────────────────────────────────────────────────────
export type StringKey =
	| 'wip_label' | 'draft' | 'wip_banner' | 'proposal'
	| 'do_now' | 'later' | 'skip' | 'yes' | 'no' | 'done' | 'mark_done'
	| 'add_note' | 'edit_note' | 'note_placeholder' | 'save_note' | 'your_note'
	| 'comments' | 'no_comments' | 'you' | 'daniel' | 'write_comment' | 'post_comment'
	| 'scope_label' | 'per_hour' | 'estimated_work' | 'would_be' | 'fixed_price' | 'you_save'
	| 'in_progress' | 'up_next' | 'completed' | 'work_planned' | 'coming_soon' | 'reach_out_directly'
	| 'flow_label' | 'scope_hint' | 'edit_section' | 'cancel' | 'save' | 'edit_section_hint'
	| 'use_case_header' | 'questions_header' | 'add_step' | 'remove_step' | 'step_placeholder'
	| 'add_scope_item' | 'add_scope_placeholder'
	| 'excl_vat' | 'required' | 'your_price';

const STRINGS: Record<OfferLang, Record<StringKey, string>> = {
	en: {
		wip_label: 'Work in progress',
		draft: 'Draft',
		wip_banner: 'A draft. Mark items, add notes, or comment. Everything saves automatically.',
		proposal: 'Proposal',
		do_now: 'Do now',
		later: 'Later',
		skip: 'Skip',
		yes: 'Yes',
		no: 'No',
		done: 'Done',
		mark_done: 'Mark done',
		add_note: '+ Note',
		edit_note: 'Edit note',
		note_placeholder: 'Your thoughts…',
		save_note: 'Save',
		your_note: 'Your note',
		comments: 'Comments',
		no_comments: 'No comments yet.',
		you: 'You',
		daniel: 'Daniel',
		write_comment: 'Write a comment…',
		post_comment: 'Post',
		scope_label: 'Scope & price',
		per_hour: '/ hour',
		estimated_work: 'Estimated work',
		would_be: 'would be',
		fixed_price: 'Fixed price',
		you_save: 'You save',
		in_progress: 'In progress',
		up_next: 'Up next',
		completed: 'Completed',
		work_planned: 'Work is being planned. Check back soon.',
		coming_soon: 'Daniel is preparing your proposal. Or',
		reach_out_directly: 'reach out directly',
		flow_label: 'Flow',
		scope_hint: 'Tap an item to defer or drop it.',
		edit_section: 'Edit',
		cancel: 'Cancel',
		save: 'Save',
		edit_section_hint: 'One step per row.',
		use_case_header: 'Use case',
		questions_header: 'Questions',
		add_step: '+ Add step',
		remove_step: 'Remove',
		step_placeholder: 'New step…',
		add_scope_item: 'Add',
		add_scope_placeholder: '+ Suggest a new item…',
		excl_vat: 'excl. VAT',
		required: 'Required',
		your_price: 'Your price',
	},
	da: {
		wip_label: 'Arbejde i gang',
		draft: 'Udkast',
		wip_banner: 'Et udkast. Marker punkter, skriv noter eller kommenter. Alt gemmes automatisk.',
		proposal: 'Tilbud',
		do_now: 'Gør nu',
		later: 'Senere',
		skip: 'Skip',
		yes: 'Ja',
		no: 'Nej',
		done: 'Færdig',
		mark_done: 'Markér færdig',
		add_note: '+ Note',
		edit_note: 'Rediger',
		note_placeholder: 'Dine tanker…',
		save_note: 'Gem',
		your_note: 'Din note',
		comments: 'Kommentarer',
		no_comments: 'Ingen kommentarer endnu.',
		you: 'Dig',
		daniel: 'Daniel',
		write_comment: 'Skriv en kommentar…',
		post_comment: 'Send',
		scope_label: 'Scope & pris',
		per_hour: '/ time',
		estimated_work: 'Estimeret arbejde',
		would_be: 'svarer til',
		fixed_price: 'Fast pris',
		you_save: 'Du sparer',
		in_progress: 'I gang',
		up_next: 'På vej',
		completed: 'Færdig',
		work_planned: 'Arbejdet planlægges. Kig forbi snart.',
		coming_soon: 'Daniel forbereder dit tilbud. Eller',
		reach_out_directly: 'kontakt direkte',
		flow_label: 'Flow',
		scope_hint: 'Tryk på et punkt for at udskyde eller fjerne det.',
		edit_section: 'Rediger',
		cancel: 'Annuller',
		save: 'Gem',
		edit_section_hint: 'Et trin pr. række.',
		use_case_header: 'Use case',
		questions_header: 'Spørgsmål',
		add_step: '+ Tilføj trin',
		remove_step: 'Fjern',
		step_placeholder: 'Nyt trin…',
		add_scope_item: 'Tilføj',
		add_scope_placeholder: '+ Foreslå et nyt punkt…',
		excl_vat: 'ekskl. moms',
		required: 'Påkrævet',
		your_price: 'Din pris',
	},
};

export function t(lang: OfferLang | undefined, key: StringKey): string {
	const l: OfferLang = lang === 'da' ? 'da' : 'en';
	return STRINGS[l][key] ?? key;
}

// ── Use case parser ─────────────────────────────────────────────────────────
// Detects "step → step → step" syntax inside a section body and splits it
// into discrete steps + an optional intro paragraph above the steps.
export type UsecaseFlow = {
	intro: string;
	steps: string[];
};

const ARROW_RE = /\s*(?:→|⟶|->)\s*/;

export function parseUsecaseSteps(body: string | undefined): UsecaseFlow | null {
	if (!body) return null;
	if (!ARROW_RE.test(body)) return null;
	const paragraphs = body.split(/\n{2,}/);
	let intro = '';
	let stepsText = '';
	for (const p of paragraphs) {
		if (ARROW_RE.test(p)) {
			stepsText = stepsText ? stepsText + ' ' + p : p;
		} else {
			intro = intro ? intro + '\n\n' + p : p;
		}
	}
	if (!stepsText) return null;
	const steps = stepsText.split(ARROW_RE).map((s) => s.trim()).filter(Boolean);
	if (steps.length < 2) return null;
	return { intro: intro.trim(), steps };
}

export type ScopeTotals = {
	includedHours: number;
	excludedHours: number;
	rate: number;
	currency: string;
	wouldBe: number;
	fixedPrice: number;
	savings: number;
	savingsPct: number;
};

export function computeScopeTotals(
	scope: ScopeData | null | undefined,
	states: Map<string, ItemState>
): ScopeTotals | null {
	if (!scope) return null;
	let includedHours = 0;
	let excludedHours = 0;
	for (const it of scope.items ?? []) {
		const status = states.get(it.id)?.status ?? null;
		// later / skip / no are all excluded from current-version totals.
		if (status === 'skip' || status === 'later' || status === 'no') excludedHours += it.hours || 0;
		else includedHours += it.hours || 0;
	}
	const rate = scope.hourly_rate ?? 0;
	const fixedPrice = scope.fixed_price ?? 0;
	const wouldBe = includedHours * rate;
	const savings = wouldBe - fixedPrice;
	const savingsPct = wouldBe > 0 ? Math.round((savings / wouldBe) * 100) : 0;
	return {
		includedHours,
		excludedHours,
		rate,
		currency: scope.currency ?? 'DKK',
		wouldBe,
		fixedPrice,
		savings,
		savingsPct,
	};
}

export function formatMoney(n: number, currency = 'DKK'): string {
	try {
		return new Intl.NumberFormat('da-DK', { maximumFractionDigits: 0 }).format(n) + ' ' + currency;
	} catch {
		return `${Math.round(n)} ${currency}`;
	}
}

/**
 * Reduce events into the current per-item state (latest event wins).
 */
/**
 * Map a source status to the equivalent status when cascading to a linked item.
 * yes  → do_now (we want this, so include it)
 * no   → skip   (we don't want this, drop it)
 * done → do_now (task complete, leave linked active)
 * other statuses pass through.
 */
export function mapStatusForCascade(status: ItemStatus | null): ItemStatus | null {
	if (status === 'yes')  return 'do_now';
	if (status === 'no')   return 'skip';
	if (status === 'done') return 'do_now';
	return status;
}

/**
 * Find an item by id anywhere in the doc (scope or sections) and return its links.
 */
export function getItemLinks(doc: OfferDoc | null, itemId: string): string[] {
	if (!doc) return [];
	for (const sec of doc.sections) {
		for (const it of sec.items ?? []) {
			if (it.id === itemId) return it.links ?? [];
		}
	}
	for (const it of doc.scope?.items ?? []) {
		if (it.id === itemId) return it.links ?? [];
	}
	return [];
}

/**
 * Latest actual_hours value per item id (admin time tracking).
 */
export function deriveActualHours(events: OfferEvent[]): Map<string, number> {
	const map = new Map<string, number>();
	const sorted = [...events].sort(
		(a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
	);
	for (const ev of sorted) {
		if (ev.kind !== 'item_actual_hours' || !ev.ref) continue;
		const h = Number(ev.payload?.hours);
		if (Number.isFinite(h)) map.set(ev.ref, h);
	}
	return map;
}

/**
 * Latest body edit per section id (regardless of actor).
 */
export function deriveSectionEdits(events: OfferEvent[]): Map<string, string> {
	const map = new Map<string, string>();
	const sorted = [...events].sort(
		(a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
	);
	for (const ev of sorted) {
		if (ev.kind !== 'section_edit' || !ev.ref) continue;
		const after = typeof ev.payload?.after === 'string' ? ev.payload.after : '';
		map.set(ev.ref, after);
	}
	return map;
}

export function deriveItemStates(events: OfferEvent[]): Map<string, ItemState> {
	const map = new Map<string, ItemState>();
	// Events arrive newest-first or oldest-first; sort to be safe.
	const sorted = [...events].sort(
		(a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
	);
	for (const ev of sorted) {
		if (!ev.ref) continue;
		const cur = map.get(ev.ref) ?? { status: null, progress: null, note: '' };
		if (ev.kind === 'item_status') {
			const next = ev.payload?.to;
			cur.status = ALL_STATUSES.includes(next) ? next : null;
		} else if (ev.kind === 'item_progress') {
			const next = ev.payload?.to;
			cur.progress = (next === 'todo' || next === 'doing' || next === 'done') ? next : null;
		} else if (ev.kind === 'item_note') {
			cur.note = typeof ev.payload?.after === 'string' ? ev.payload.after : '';
		}
		map.set(ev.ref, cur);
	}
	return map;
}

/**
 * Pretty-printed JSON for export, omitting empty fields.
 */
export function exportOfferDoc(doc: OfferDoc | null): string {
	if (!doc) return '';
	const out: any = {};
	if (doc.lang) out.lang = doc.lang;
	if (doc.client_name) out.client_name = doc.client_name;
	if (doc.title) out.title = doc.title;
	if (doc.deadline) out.deadline = doc.deadline;
	if (doc.intro) out.intro = doc.intro;
	if (doc.scope) {
		const sc: any = {};
		if (doc.scope.label) sc.label = doc.scope.label;
		if (doc.scope.currency) sc.currency = doc.scope.currency;
		if (doc.scope.hourly_rate != null) sc.hourly_rate = doc.scope.hourly_rate;
		if (doc.scope.fixed_price != null) sc.fixed_price = doc.scope.fixed_price;
		sc.items = (doc.scope.items ?? []).map((i) => ({
			id: i.id, text: i.text, hours: i.hours,
			...(i.group ? { group: i.group } : {}),
			...(i.links && i.links.length ? { links: i.links } : {}),
			...(i.required ? { required: true } : {}),
		}));
		out.scope = sc;
	}
	out.sections = doc.sections.map((s) => {
		const sec: any = { id: s.id, title: s.title };
		if (s.kind) sec.kind = s.kind;
		if (s.body) sec.body = s.body;
		sec.items = (s.items ?? []).map((i) => ({
			id: i.id, text: i.text,
			...(i.links && i.links.length ? { links: i.links } : {}),
		}));
		return sec;
	});
	if (doc.outro) out.outro = doc.outro;
	return JSON.stringify(out, null, 2);
}
