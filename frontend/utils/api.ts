const API_BASE_URL = "http://localhost:5000/api";

// Types
export interface RegisterPayload {
    username: string;
    email: string;
    password: string;
}

export interface LoginPayload {
    email: string;
    password: string;
}

export interface MenuItem {
    id: string;
    name: string;
    price: number;
    image?: string;
    description?: string;
    category?: string;
}

export interface OrderPayload {
    items: Array<{ id: string; quantity: number }>;
    deliveryInfo?: Record<string, any>;
    totalPrice?: number;
}

export interface UserProfile {
    id: number;
    username: string;
    email: string;
    name?: string;
    address?: string;
    deposited_cash: number;
    payment_method?: string;
    created_at?: string;
}

export interface UpdateProfilePayload {
    name?: string;
    address?: string;
    deposited_cash?: number;
    payment_method?: string;
}

const getAuthToken = (): string | null => localStorage.getItem("authToken");
const setAuthToken = (token: string | null) => {
    if (token) localStorage.setItem("authToken", token);
    else localStorage.removeItem("authToken");
};

async function fetchAPI(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${API_BASE_URL}/${endpoint.replace(/^\//, "")}`;

    // Use Headers to safely set fields
    const headers = new Headers(options.headers as HeadersInit);
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");

    const authToken = getAuthToken();
    if (authToken) headers.set("Authorization", `Bearer ${authToken}`);

    const response = await fetch(url, { ...options, headers });

    // try to parse JSON body safely
    const text = await response.text();
    let body: any = null;
    try {
        body = text ? JSON.parse(text) : null;
    } catch (e) {
        body = text;
    }

    if (!response.ok) {
        const err = new Error(body && body.message ? body.message : `API request failed with status ${response.status}`);
        // attach status and body for callers that want more info
        (err as any).status = response.status;
        (err as any).body = body;
        throw err;
    }

    return body;
}


// API functions
export const api = {
    // Health
    healthCheck: () => fetchAPI("health"),

    // Auth
    register: async (payload: RegisterPayload) => {
        return fetchAPI("auth/register", {
            method: "POST",
            body: JSON.stringify({ username: payload.username, email: payload.email, password: payload.password }),
        });
    },

    login: async (payload: LoginPayload) => {
        const res = await fetchAPI("auth/login", {
            method: "POST",
            body: JSON.stringify({ email: payload.email, password: payload.password }),
        });
        // expect { token: string } or similar
        if (res && res.token) setAuthToken(res.token);
        return res;
    },

    logout: () => setAuthToken(null),

    // Profile operations
    getProfile: () => fetchAPI("auth/profile"),

    updateProfile: (payload: UpdateProfilePayload) => fetchAPI("auth/profile", {
        method: "PUT",
        body: JSON.stringify(payload),
    }),

    // Menu operations
    getMenu: (category?: string) => {
        const endpoint = category ? `menu?category=${encodeURIComponent(category)}` : "menu";
        return fetchAPI(endpoint);
    },

    getMenuItem: (itemId: string) => fetchAPI(`menu/${encodeURIComponent(itemId)}`),

    // Orders
    getOrders: () => fetchAPI("orders"),

    createOrder: (order: OrderPayload) => fetchAPI("orders", { method: "POST", body: JSON.stringify(order) }),
};