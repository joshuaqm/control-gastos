--
-- PostgreSQL database dump
--

\restrict fuePuyaNPA00dF7gKu6PwScQsymebhS7aVQiNdgJo9any2brBT4gsAXd8GXOn6a

-- Dumped from database version 15.18
-- Dumped by pg_dump version 15.18

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: finance_user
--

CREATE TABLE public.accounts (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    type character varying(20) NOT NULL,
    initial_balance numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    credit_limit numeric(12,2),
    interest_rate numeric(5,2),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    user_id integer NOT NULL,
    cutoff_day integer,
    payment_due_day integer,
    last_interest_at date
);


ALTER TABLE public.accounts OWNER TO finance_user;

--
-- Name: accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: finance_user
--

CREATE SEQUENCE public.accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.accounts_id_seq OWNER TO finance_user;

--
-- Name: accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: finance_user
--

ALTER SEQUENCE public.accounts_id_seq OWNED BY public.accounts.id;


--
-- Name: budgets; Type: TABLE; Schema: public; Owner: finance_user
--

CREATE TABLE public.budgets (
    id integer NOT NULL,
    month date NOT NULL,
    budget_type character varying(10),
    percentage numeric(5,2) NOT NULL,
    target_amount numeric(12,2) NOT NULL,
    notes character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    user_id integer NOT NULL,
    category character varying(50)
);


ALTER TABLE public.budgets OWNER TO finance_user;

--
-- Name: budgets_id_seq; Type: SEQUENCE; Schema: public; Owner: finance_user
--

CREATE SEQUENCE public.budgets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.budgets_id_seq OWNER TO finance_user;

--
-- Name: budgets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: finance_user
--

ALTER SEQUENCE public.budgets_id_seq OWNED BY public.budgets.id;


--
-- Name: credit_installments; Type: TABLE; Schema: public; Owner: finance_user
--

CREATE TABLE public.credit_installments (
    id integer NOT NULL,
    user_id integer NOT NULL,
    account_id integer,
    description character varying(200) NOT NULL,
    monthly_amount numeric(12,2) NOT NULL,
    months_total integer NOT NULL,
    months_paid integer DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    notes character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    start_date date
);


ALTER TABLE public.credit_installments OWNER TO finance_user;

--
-- Name: credit_installments_id_seq; Type: SEQUENCE; Schema: public; Owner: finance_user
--

CREATE SEQUENCE public.credit_installments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.credit_installments_id_seq OWNER TO finance_user;

--
-- Name: credit_installments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: finance_user
--

ALTER SEQUENCE public.credit_installments_id_seq OWNED BY public.credit_installments.id;


--
-- Name: debts; Type: TABLE; Schema: public; Owner: finance_user
--

CREATE TABLE public.debts (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    creditor character varying(100) NOT NULL,
    type character varying(20) NOT NULL,
    original_amount numeric(12,2) NOT NULL,
    interest_rate numeric(5,2),
    start_date date NOT NULL,
    due_date date,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    notes character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    user_id integer NOT NULL,
    paid_amount numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    account_id integer
);


ALTER TABLE public.debts OWNER TO finance_user;

--
-- Name: debts_id_seq; Type: SEQUENCE; Schema: public; Owner: finance_user
--

CREATE SEQUENCE public.debts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.debts_id_seq OWNER TO finance_user;

--
-- Name: debts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: finance_user
--

ALTER SEQUENCE public.debts_id_seq OWNED BY public.debts.id;


--
-- Name: goals; Type: TABLE; Schema: public; Owner: finance_user
--

CREATE TABLE public.goals (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    target_amount numeric(12,2) NOT NULL,
    current_amount numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    target_date date,
    priority integer DEFAULT 1 NOT NULL,
    notes character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    user_id integer NOT NULL,
    account_id integer
);


ALTER TABLE public.goals OWNER TO finance_user;

--
-- Name: goals_id_seq; Type: SEQUENCE; Schema: public; Owner: finance_user
--

CREATE SEQUENCE public.goals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.goals_id_seq OWNER TO finance_user;

--
-- Name: goals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: finance_user
--

ALTER SEQUENCE public.goals_id_seq OWNED BY public.goals.id;


--
-- Name: investments; Type: TABLE; Schema: public; Owner: finance_user
--

CREATE TABLE public.investments (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    ticker character varying(10),
    broker character varying(50),
    type character varying(20) NOT NULL,
    units numeric(12,4) NOT NULL,
    average_cost numeric(12,2) NOT NULL,
    current_price numeric(12,2),
    last_updated date,
    notes character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    user_id integer NOT NULL,
    purchase_date date
);


ALTER TABLE public.investments OWNER TO finance_user;

--
-- Name: investments_id_seq; Type: SEQUENCE; Schema: public; Owner: finance_user
--

CREATE SEQUENCE public.investments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.investments_id_seq OWNER TO finance_user;

--
-- Name: investments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: finance_user
--

ALTER SEQUENCE public.investments_id_seq OWNED BY public.investments.id;


--
-- Name: receivables; Type: TABLE; Schema: public; Owner: finance_user
--

CREATE TABLE public.receivables (
    id integer NOT NULL,
    person character varying(100) NOT NULL,
    description character varying(200),
    original_amount numeric(12,2) NOT NULL,
    due_date date,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    notes character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    user_id integer NOT NULL,
    collected_amount numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    account_id integer
);


ALTER TABLE public.receivables OWNER TO finance_user;

--
-- Name: receivables_id_seq; Type: SEQUENCE; Schema: public; Owner: finance_user
--

CREATE SEQUENCE public.receivables_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.receivables_id_seq OWNER TO finance_user;

--
-- Name: receivables_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: finance_user
--

ALTER SEQUENCE public.receivables_id_seq OWNED BY public.receivables.id;


--
-- Name: recurring_transactions; Type: TABLE; Schema: public; Owner: finance_user
--

CREATE TABLE public.recurring_transactions (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    amount numeric(12,2) NOT NULL,
    frequency character varying(20) NOT NULL,
    next_date date NOT NULL,
    category character varying(50),
    budget_type character varying(10),
    account_id integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    notes character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    user_id integer NOT NULL,
    interval_days integer
);


ALTER TABLE public.recurring_transactions OWNER TO finance_user;

--
-- Name: recurring_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: finance_user
--

CREATE SEQUENCE public.recurring_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.recurring_transactions_id_seq OWNER TO finance_user;

--
-- Name: recurring_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: finance_user
--

ALTER SEQUENCE public.recurring_transactions_id_seq OWNED BY public.recurring_transactions.id;


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: finance_user
--

CREATE TABLE public.transactions (
    id integer NOT NULL,
    date date NOT NULL,
    description character varying(200) NOT NULL,
    amount numeric(12,2) NOT NULL,
    type character varying(20) NOT NULL,
    category character varying(50),
    budget_type character varying(10),
    notes character varying(200),
    account_id integer,
    destination_account_id integer,
    debt_id integer,
    receivable_id integer,
    recurring_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    user_id integer NOT NULL,
    goal_id integer
);


ALTER TABLE public.transactions OWNER TO finance_user;

--
-- Name: transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: finance_user
--

CREATE SEQUENCE public.transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.transactions_id_seq OWNER TO finance_user;

--
-- Name: transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: finance_user
--

ALTER SEQUENCE public.transactions_id_seq OWNED BY public.transactions.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: finance_user
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    monthly_income numeric(12,2),
    currency character varying(10) DEFAULT 'MXN'::character varying NOT NULL,
    notifications_enabled boolean DEFAULT true NOT NULL
);


ALTER TABLE public.users OWNER TO finance_user;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: finance_user
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO finance_user;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: finance_user
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: accounts id; Type: DEFAULT; Schema: public; Owner: finance_user
--

ALTER TABLE ONLY public.accounts ALTER COLUMN id SET DEFAULT nextval('public.accounts_id_seq'::regclass);


--
-- Name: budgets id; Type: DEFAULT; Schema: public; Owner: finance_user
--

ALTER TABLE ONLY public.budgets ALTER COLUMN id SET DEFAULT nextval('public.budgets_id_seq'::regclass);


--
-- Name: credit_installments id; Type: DEFAULT; Schema: public; Owner: finance_user
--

ALTER TABLE ONLY public.credit_installments ALTER COLUMN id SET DEFAULT nextval('public.credit_installments_id_seq'::regclass);


--
-- Name: debts id; Type: DEFAULT; Schema: public; Owner: finance_user
--

ALTER TABLE ONLY public.debts ALTER COLUMN id SET DEFAULT nextval('public.debts_id_seq'::regclass);


--
-- Name: goals id; Type: DEFAULT; Schema: public; Owner: finance_user
--

ALTER TABLE ONLY public.goals ALTER COLUMN id SET DEFAULT nextval('public.goals_id_seq'::regclass);


--
-- Name: investments id; Type: DEFAULT; Schema: public; Owner: finance_user
--

ALTER TABLE ONLY public.investments ALTER COLUMN id SET DEFAULT nextval('public.investments_id_seq'::regclass);


--
-- Name: receivables id; Type: DEFAULT; Schema: public; Owner: finance_user
--

ALTER TABLE ONLY public.receivables ALTER COLUMN id SET DEFAULT nextval('public.receivables_id_seq'::regclass);


--
-- Name: recurring_transactions id; Type: DEFAULT; Schema: public; Owner: finance_user
--

ALTER TABLE ONLY public.recurring_transactions ALTER COLUMN id SET DEFAULT nextval('public.recurring_transactions_id_seq'::regclass);


--
-- Name: transactions id; Type: DEFAULT; Schema: public; Owner: finance_user
--

ALTER TABLE ONLY public.transactions ALTER COLUMN id SET DEFAULT nextval('public.transactions_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: finance_user
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: goals PK_26e17b251afab35580dff769223; Type: CONSTRAINT; Schema: public; Owner: finance_user
--

ALTER TABLE ONLY public.goals
    ADD CONSTRAINT "PK_26e17b251afab35580dff769223" PRIMARY KEY (id);


--
-- Name: debts PK_4bd9f54aab9e59628a3a2657fa1; Type: CONSTRAINT; Schema: public; Owner: finance_user
--

ALTER TABLE ONLY public.debts
    ADD CONSTRAINT "PK_4bd9f54aab9e59628a3a2657fa1" PRIMARY KEY (id);


--
-- Name: accounts PK_5a7a02c20412299d198e097a8fe; Type: CONSTRAINT; Schema: public; Owner: finance_user
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT "PK_5a7a02c20412299d198e097a8fe" PRIMARY KEY (id);


--
-- Name: recurring_transactions PK_6485db3243762a54992dc0ce3b7; Type: CONSTRAINT; Schema: public; Owner: finance_user
--

ALTER TABLE ONLY public.recurring_transactions
    ADD CONSTRAINT "PK_6485db3243762a54992dc0ce3b7" PRIMARY KEY (id);


--
-- Name: budgets PK_9c8a51748f82387644b773da482; Type: CONSTRAINT; Schema: public; Owner: finance_user
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT "PK_9c8a51748f82387644b773da482" PRIMARY KEY (id);


--
-- Name: investments PK_a1263853f1a4fb8b849c1c9aff4; Type: CONSTRAINT; Schema: public; Owner: finance_user
--

ALTER TABLE ONLY public.investments
    ADD CONSTRAINT "PK_a1263853f1a4fb8b849c1c9aff4" PRIMARY KEY (id);


--
-- Name: transactions PK_a219afd8dd77ed80f5a862f1db9; Type: CONSTRAINT; Schema: public; Owner: finance_user
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY (id);


--
-- Name: users PK_a3ffb1c0c8416b9fc6f907b7433; Type: CONSTRAINT; Schema: public; Owner: finance_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);


--
-- Name: credit_installments PK_c4fc897a3067394c8b62d443c3e; Type: CONSTRAINT; Schema: public; Owner: finance_user
--

ALTER TABLE ONLY public.credit_installments
    ADD CONSTRAINT "PK_c4fc897a3067394c8b62d443c3e" PRIMARY KEY (id);


--
-- Name: receivables PK_d77a2c19436083a2039cf06f1ec; Type: CONSTRAINT; Schema: public; Owner: finance_user
--

ALTER TABLE ONLY public.receivables
    ADD CONSTRAINT "PK_d77a2c19436083a2039cf06f1ec" PRIMARY KEY (id);


--
-- Name: users UQ_97672ac88f789774dd47f7c8be3; Type: CONSTRAINT; Schema: public; Owner: finance_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE (email);


--
-- Name: users UQ_fe0bb3f6520ee0469504521e710; Type: CONSTRAINT; Schema: public; Owner: finance_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE (username);


--
-- Name: receivables FK_0bac15b30fbb7a214f9a275ab6a; Type: FK CONSTRAINT; Schema: public; Owner: finance_user
--

ALTER TABLE ONLY public.receivables
    ADD CONSTRAINT "FK_0bac15b30fbb7a214f9a275ab6a" FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: accounts FK_3000dad1da61b29953f07476324; Type: FK CONSTRAINT; Schema: public; Owner: finance_user
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT "FK_3000dad1da61b29953f07476324" FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: transactions FK_49c0d6e8ba4bfb5582000d851f0; Type: FK CONSTRAINT; Schema: public; Owner: finance_user
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT "FK_49c0d6e8ba4bfb5582000d851f0" FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: credit_installments FK_49e610f839b750f9b169ccb6b42; Type: FK CONSTRAINT; Schema: public; Owner: finance_user
--

ALTER TABLE ONLY public.credit_installments
    ADD CONSTRAINT "FK_49e610f839b750f9b169ccb6b42" FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: budgets FK_5d25d8bbd6c209261dfe04558f1; Type: FK CONSTRAINT; Schema: public; Owner: finance_user
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT "FK_5d25d8bbd6c209261dfe04558f1" FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: goals FK_88b78010581f2d293699d064441; Type: FK CONSTRAINT; Schema: public; Owner: finance_user
--

ALTER TABLE ONLY public.goals
    ADD CONSTRAINT "FK_88b78010581f2d293699d064441" FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: debts FK_c7948d788f06ddc7e0e6ce68ca3; Type: FK CONSTRAINT; Schema: public; Owner: finance_user
--

ALTER TABLE ONLY public.debts
    ADD CONSTRAINT "FK_c7948d788f06ddc7e0e6ce68ca3" FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: recurring_transactions FK_d78f3002f99b0f15a3797201c92; Type: FK CONSTRAINT; Schema: public; Owner: finance_user
--

ALTER TABLE ONLY public.recurring_transactions
    ADD CONSTRAINT "FK_d78f3002f99b0f15a3797201c92" FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: credit_installments FK_dc1b1b51562b96cc7cfed552fc1; Type: FK CONSTRAINT; Schema: public; Owner: finance_user
--

ALTER TABLE ONLY public.credit_installments
    ADD CONSTRAINT "FK_dc1b1b51562b96cc7cfed552fc1" FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: transactions FK_e9acc6efa76de013e8c1553ed2b; Type: FK CONSTRAINT; Schema: public; Owner: finance_user
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT "FK_e9acc6efa76de013e8c1553ed2b" FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: investments FK_fe9d6987f15c1cce3ff55dd25e2; Type: FK CONSTRAINT; Schema: public; Owner: finance_user
--

ALTER TABLE ONLY public.investments
    ADD CONSTRAINT "FK_fe9d6987f15c1cce3ff55dd25e2" FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict fuePuyaNPA00dF7gKu6PwScQsymebhS7aVQiNdgJo9any2brBT4gsAXd8GXOn6a

