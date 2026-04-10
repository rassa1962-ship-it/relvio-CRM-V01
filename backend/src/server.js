"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) { function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } } function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } } function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); } step((generator = generator.apply(thisArg, _arguments || [])).next()); });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, this);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var cors_1 = require("cors");
var zod_1 = require("zod");
var supabase_js_1 = require("@supabase/supabase-js");
var dotenv = require("dotenv");
var auth_1 = require("./middleware/auth");
dotenv.config();
var app = (0, express_1.default)();
var port = 3001;
app.use((0, cors_1.default)({
    origin: ['http://localhost:3000', 'http://localhost:3002'],
    credentials: true
}));
app.use(express_1.default.json());
app.use(function (req, res, next) {
    console.log('INCOMING', req.method, req.url);
    next();
});
var supabaseUrl = process.env.SUPABASE_URL;
var supabaseAnon = process.env.SUPABASE_ANON_KEY;
var supabaseService = process.env.SUPABASE_SERVICE_ROLE_KEY;
var supabasePublic = (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnon);
var supabaseAdmin = (0, supabase_js_1.createClient)(supabaseUrl, supabaseService, {
    auth: { autoRefreshToken: false, persistSession: false }
});

// Schema for public leads
var publicLeadsSchema = zod_1.z.object({
    specialist_id: zod_1.z.string().uuid(),
    mh_segment_code: zod_1.z.string().min(1),
    contact_channel: zod_1.z.enum(['telegram', 'vk', 'email', 'phone', 'in_app', 'other']),
    contact_value: zod_1.z.string().min(1),
    meta: zod_1.z.record(zod_1.z.any()).optional()
});

// POST /api/public/leads
app.post('/api/public/leads', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var parseResult, specialist_id, mh_segment_code, contact_channel, contact_value, meta, specialist, data, error;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                parseResult = publicLeadsSchema.safeParse(req.body);
                if (!parseResult.success) {
                    return [2 /*return*/, res.status(400).json({ error: 'Invalid input', details: parseResult.error.flatten() })];
                }
                specialist_id = parseResult.data.specialist_id, mh_segment_code = parseResult.data.mh_segment_code, contact_channel = parseResult.data.contact_channel, contact_value = parseResult.data.contact_value, meta = parseResult.data.meta;
                return [4 /*yield*/, supabaseAdmin
                        .from('specialists')
                        .select('id')
                        .eq('id', specialist_id)
                        .single()];
            case 1:
                specialist = (_a.sent()).data;
                if (!specialist) {
                    return [2 /*return*/, res.status(404).json({ error: 'Specialist not found' })];
                }
                return [4 /*yield*/, supabaseAdmin
                        .from('leads')
                        .insert({
                        specialist_id: specialist_id,
                        mh_segment_code: mh_segment_code,
                        contact_channel: contact_channel,
                        contact_value: contact_value,
                        status: 'new',
                        meta: meta || null
                    })
                        .select()
                        .single()];
            case 2:
                data = (_a.sent()).data, error = (_a.sent()).error;
                if (error) throw error;
                res.status(201).json(data);
                return [2 /*return*/];
        }
    });
}); });

// GET /api/me
app.get('/api/me', auth_1.authenticate, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var specialistId, userClient, data, error;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                specialistId = req.specialistId, userClient = req.userClient;
                return [4 /*yield*/, userClient.from('specialists').select('*').eq('id', specialistId).single()];
            case 1:
                data = (_a.sent()).data, error = (_a.sent()).error;
                if (error) throw error;
                res.json(data);
                return [2 /*return*/];
        }
    });
}); });

// GET /api/leads
app.get('/api/leads', auth_1.authenticate, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userClient, status, query, data, error;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                userClient = req.userClient;
                status = req.query.status;
                query = userClient.from('leads').select('*').order('created_at', { ascending: false });
                if (status) {
                    query = query.eq('status', status);
                }
                return [4 /*yield*/, query];
            case 1:
                data = (_a.sent()).data, error = (_a.sent()).error;
                if (error) throw error;
                res.json(data);
                return [2 /*return*/];
        }
    });
}); });

// PATCH /api/leads/:id
app.patch('/api/leads/:id', auth_1.authenticate, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var specialistId, userClient, id, status, client_id, data, error;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                specialistId = req.specialistId, userClient = req.userClient;
                id = req.params.id;
                status = req.body.status, client_id = req.body.client_id;
                return [4 /*yield*/, userClient.from('leads').update({
                        status: status,
                        client_id: client_id,
                        updated_at: new Date().toISOString()
                    }).eq('id', id).eq('specialist_id', specialistId).select().single()];
            case 1:
                data = (_a.sent()).data, error = (_a.sent()).error;
                if (error) throw error;
                res.json(data);
                return [2 /*return*/];
        }
    });
}); });

// GET /api/clients
app.get('/api/clients', auth_1.authenticate, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var specialistId, userClient, data, error;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                specialistId = req.specialistId, userClient = req.userClient;
                return [4 /*yield*/, userClient.from('clients').select('*').eq('specialist_id', specialistId)];
            case 1:
                data = (_a.sent()).data, error = (_a.sent()).error;
                if (error) throw error;
                res.json(data);
                return [2 /*return*/];
        }
    });
}); });

// POST /api/clients
app.post('/api/clients', auth_1.authenticate, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var specialistId, bodySchema, _a, display_name, contact_channel, contact_value, status_1, source, data, error;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                specialistId = req.specialistId;
                bodySchema = zod_1.z.object({
                    display_name: zod_1.z.string(),
                    contact_channel: zod_1.z.enum(['telegram', 'email', 'phone', 'other']),
                    contact_value: zod_1.z.string(),
                    status: zod_1.z.enum(['new', 'active', 'paused', 'closed']).default('active'),
                    source: zod_1.z.enum(['manual', 'mental_helper', 'other']).default('manual')
                });
                _a = bodySchema.parse(req.body), display_name = _a.display_name, contact_channel = _a.contact_channel, contact_value = _a.contact_value, status_1 = _a.status, source = _a.source;
                return [4 /*yield*/, supabaseAdmin.from('clients').insert({
                        specialist_id: specialistId,
                        display_name: display_name,
                        contact_channel: contact_channel,
                        contact_value: contact_value,
                        status: status_1,
                        source: source
                    }).select().single()];
            case 1:
                data = (_b.sent()).data, error = (_b.sent()).error;
                if (error) throw error;
                res.status(201).json(data);
                return [2 /*return*/];
        }
    });
}); });

// GET /api/sessions
app.get('/api/sessions', auth_1.authenticate, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var specialistId, userClient, from, to, client_id, query, data, error;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                specialistId = req.specialistId, userClient = req.userClient;
                from = req.query.from;
                to = req.query.to;
                client_id = req.query.client_id;
                query = userClient.from('sessions').select('*, clients!inner(*)').eq('clients.specialist_id', specialistId);
                if (client_id) query = query.eq('client_id', client_id);
                if (from && to) query = query.gte('start_time', from).lte('start_time', to);
                return [4 /*yield*/, query.order('start_time')];
            case 1:
                data = (_a.sent()).data, error = (_a.sent()).error;
                if (error) throw error;
                res.json(data);
                return [2 /*return*/];
        }
    });
}); });

// POST /api/sessions
app.post('/api/sessions', auth_1.authenticate, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var specialistId, bodySchema, body, client, data, error;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                specialistId = req.specialistId;
                bodySchema = zod_1.z.object({
                    client_id: zod_1.z.string().uuid(),
                    start_time: zod_1.z.string(),
                    duration_minutes: zod_1.z.number().default(60),
                    format: zod_1.z.enum(['online', 'offline']),
                    status: zod_1.z.enum(['scheduled', 'done', 'no_show', 'cancelled']).default('scheduled'),
                    short_summary: zod_1.z.string().optional(),
                    price: zod_1.z.number().optional(),
                    is_paid: zod_1.z.boolean().default(false)
                });
                body = bodySchema.parse(req.body);
                return [4 /*yield*/, supabaseAdmin.from('clients').select('id').eq('id', body.client_id).eq('specialist_id', specialistId).single()];
            case 1:
                client = (_a.sent()).data;
                if (!client) {
                    return [2 /*return*/, res.status(404).json({ error: 'Client not found or not yours' })];
                }
                return [4 /*yield*/, supabaseAdmin.from('sessions').insert(body).select().single()];
            case 2:
                data = (_a.sent()).data, error = (_a.sent()).error;
                if (error) throw error;
                res.status(201).json(data);
                return [2 /*return*/];
        }
    });
}); });

// ============ ADMIN ROUTES ============

// GET /api/admin/leads - all leads with filters
app.get('/api/admin/leads', auth_1.authenticate, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var status, channel, dateFrom, dateTo, limit, offset, query, data, count, error;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                status = req.query.status, channel = req.query.channel, dateFrom = req.query.dateFrom, dateTo = req.query.dateTo, limit = req.query.limit, offset = req.query.offset;
                query = supabaseAdmin.from('leads').select('*, specialists(full_name, email)', { count: 'exact' }).order('created_at', { ascending: false });
                if (status) query = query.eq('status', status);
                if (channel) query = query.eq('contact_channel', channel);
                if (dateFrom) query = query.gte('created_at', dateFrom);
                if (dateTo) query = query.lte('created_at', dateTo);
                if (limit) query = query.limit(parseInt(limit));
                if (offset) query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit || '20') - 1);
                return [4 /*yield*/, query];
            case 1:
                data = (_a.sent()).data, count = (_a.sent()).count, error = (_a.sent()).error;
                if (error) throw error;
                res.json({ leads: data, total: count });
                return [2 /*return*/];
        }
    });
}); });

// GET /api/admin/specialists - all specialists
app.get('/api/admin/specialists', auth_1.authenticate, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var data, error;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, supabaseAdmin.from('specialists').select('id, full_name, email').order('full_name')];
            case 1:
                data = (_a.sent()).data, error = (_a.sent()).error;
                if (error) throw error;
                res.json(data);
                return [2 /*return*/];
        }
    });
}); });

// PATCH /api/admin/leads/:id - update lead
app.patch('/api/admin/leads/:id', auth_1.authenticate, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, status, specialist_id, client_id, updates, data, error;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id = req.params.id;
                status = req.body.status, specialist_id = req.body.specialist_id, client_id = req.body.client_id;
                updates = { updated_at: new Date().toISOString() };
                if (status) updates.status = status;
                if (specialist_id !== undefined) updates.specialist_id = specialist_id;
                if (client_id !== undefined) updates.client_id = client_id;
                return [4 /*yield*/, supabaseAdmin.from('leads').update(updates).eq('id', id).select('*, specialists(full_name, email)').single()];
            case 1:
                data = (_a.sent()).data, error = (_a.sent()).error;
                if (error) throw error;
                res.json(data);
                return [2 /*return*/];
        }
    });
}); });

// GET /api/funnel/summary
app.get('/api/funnel/summary', auth_1.authenticate, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var specialistId, userClient, thirtyDaysAgo, statuses, summary, _i, statuses_1, status_1, count, error, _a, count_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                specialistId = req.specialistId, userClient = req.userClient;
                thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
                statuses = ['new', 'contacted', 'booked', 'no_response', 'declined'];
                summary = { new: 0, contacted: 0, booked: 0, no_response: 0, declined: 0 };
                _i = 0, statuses_1 = statuses;
                _b.label = 1;
            case 1:
                if (!(_i < statuses_1.length)) return [3 /*break*/, 4];
                status_1 = statuses_1[_i];
                return [4 /*yield*/, userClient.from('leads').select('*', { count: 'exact', head: true }).eq('specialist_id', specialistId).eq('status', status_1).gte('created_at', thirtyDaysAgo)];
            case 2:
                count = (_b.sent()).count, error = (_b.sent()).error;
                if (!error) summary[status_1] = count || 0;
                _b.label = 3;
            case 3:
                _i++;
                return [3 /*break*/, 1];
            case 4:
                res.json(summary);
                return [2 /*return*/];
        }
    });
}); });

app.listen(port, function () {
    console.log("Mini-CRM Backend running on http://localhost:" + port);
    console.log('Available routes:');
    console.log('  POST /api/public/leads');
    console.log('  GET  /api/admin/leads');
    console.log('  GET  /api/admin/specialists');
    console.log('  PATCH /api/admin/leads/:id');
});
