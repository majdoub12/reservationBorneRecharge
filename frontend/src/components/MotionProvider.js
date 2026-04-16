import React from 'react';
import { motion } from 'framer-motion';

/**
 * Global variants for consistent animations
 */
const pageVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.3 } }
};

const staggerContainer = {
    visible: {
        transition: {
            staggerChildren: 0.08
        }
    }
};

const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
    }
};

export const PageWrapper = ({ children, className = "" }) => (
    <motion.div
        className={className}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
    >
        {children}
    </motion.div>
);

export const AnimatedTitle = ({ children, className = "" }) => (
    <motion.h1
        className={className}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
        {children}
    </motion.h1>
);

export const StaggerSection = ({ children, className = "", delay = 0 }) => (
    <motion.div
        className={className}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        variants={staggerContainer}
        transition={{ delayChildren: delay }}
    >
        {children}
    </motion.div>
);

export const MotionItem = ({ children, className = "" }) => (
    <motion.div
        variants={fadeInUp}
        className={className}
    >
        {children}
    </motion.div>
);
